import minimist from 'minimist'
import Parser from 'rss-parser';
import { promises as fs } from 'fs'
import path from 'path'
import { tmpdir } from 'os';
import TOML from '@iarna/toml'

type FieldValues = { [key:string]: string };

function parseExtraFieldValues(kvs: string | string[]): FieldValues {

  const realKVs = typeof(kvs) === 'string' ? [kvs] : kvs;

  return realKVs.reduce((obj: FieldValues, kv: string): FieldValues => {

    const splitKV = kv.split("=", 2)

    if (splitKV.length != 2)
      throw `invalid --extraFieldValue, must be of the form "key=value"`;

    obj[splitKV[0]] = splitKV[1]
    return obj

  }, {});
}

const args = minimist(process.argv.slice(2))

const inputRSS: string = args.in
const outputPath: string = args.out
const lastN: number | null = args.lastN ? parseInt(args.lastN) : null
const extraFieldValues: FieldValues = parseExtraFieldValues(args.extraFieldValue ? args.extraFieldValue : [])

if (args.help || !inputRSS || !outputPath) {
  console.log(`
Usage: ${process.argv0} ${process.argv[1]} [options] --in <RSS-URL> --out <local-folder>

Options:
  --lastN number
  --extraFieldValue "field=value"
`)
  process.exit(args.help ? 0 : 1)
}

type MarkdownPost = {
  title: string
  originalLink: string
  pubDate: Date,
  author: string,
  content: string,
  contentSnippet?: string | null,
  extraFieldValues: FieldValues,
}

type ExtraFields = {
  author: string
}

type ExtraFeedFields = {
  author: { name: string }
}

export function feedItemToMarkdownPost(item: Parser.Item & ExtraFields): MarkdownPost {
  const {
    title,
    pubDate,
    author,
    content,
    link,
  } = item

  if (!title || !link || !content || !pubDate) {
    throw new Error("Feed item is missing required attribute")
  }

  let { contentSnippet } = item
  if (!!contentSnippet && contentSnippet.length > 100) {
    contentSnippet = contentSnippet.substr(0, 100) + "..."
  }

  return {
    title,
    originalLink: link,
    pubDate: new Date(pubDate),
    author,
    content,
    contentSnippet: contentSnippet || "",
    extraFieldValues,
  }
}

async function writeMarkdownPost(outDir: string, { title, author, originalLink, contentSnippet, content, pubDate, extraFieldValues }: MarkdownPost) {
  // Hack so that the content doesn't terminate the front matter
  content = content.replace(/[+]{3}/g, "\\u002B\\u002B\\u002B")

  const mdContent = `
+++
${TOML.stringify({
    title,
    date: pubDate,
    template: "html_content/raw.html",
    ...(!!contentSnippet ? { summary: contentSnippet } : {}),
    extra: { author, originalLink, raw: content, ...extraFieldValues },
  })}
+++
${content}
`.replace(/(\\\\u002B){3}/g, "\\u002B\\u002B\\u002B") // Remove one level of escaping so these come out as "\u002B" in the toml front matter.
  await fs.writeFile(path.join(outDir, `${author}-${title}.md`), mdContent)
}

const parser = new Parser<ExtraFeedFields, ExtraFields>({ customFields: { feed: ["author"] } });
(async () => {
  const feed = await parser.parseURL(inputRSS);
  let mdPosts = feed.items.map(feedItemToMarkdownPost)
  if (!!lastN) {
    mdPosts = mdPosts.slice(0, lastN)
  }


  await Promise.all(mdPosts.map(p => {
    return writeMarkdownPost(outputPath, { ...p, author: p.author || feed.author?.name[0] })
  }))
})()
