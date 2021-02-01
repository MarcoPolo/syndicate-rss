import minimist from 'minimist'
import Parser from 'rss-parser';
import { promises as fs } from 'fs'
import path from 'path'
import { tmpdir } from 'os';
import TOML from '@iarna/toml'




const args = minimist(process.argv.slice(2))

const inputRSS: string = args.in
const outputPath: string = args.out
const lastN: number | null = args.lastN ? parseInt(args.lastN) : null

if (args.help || !inputRSS || !outputPath) {
  console.log(`Usage: ${process.argv0} ${process.argv[1]} --in <RSS-URL> --out <local-folder> (optionally: --lastN number)`)
  process.exit(args.help ? 0 : 1)
}

type MarkdownPost = {
  title: string
  originalLink: string
  pubDate: Date,
  author: string,
  content: string,
  contentSnippet?: string | null,
}

type ExtraFields = {
  author: string
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
  }
}

async function writeMarkdownPost(outDir: string, { title, author, originalLink, contentSnippet, content, pubDate }: MarkdownPost) {

  const mdContent = `
+++
${TOML.stringify({
    title,
    originalLink,
    date: pubDate,
    template: "html_content/raw.html",
    ...(!!contentSnippet ? { summary: contentSnippet } : {}),
    extra: { author, raw: content },
  })}
+++
# DO NOT RENDER
`
  await fs.writeFile(path.join(outDir, `${author}-${title}.md`), mdContent)
}

const parser = new Parser<ExtraFields, ExtraFields>({ customFields: { feed: ["author"] } });
(async () => {
  const feed = await parser.parseURL(inputRSS);
  let mdPosts = feed.items.map(feedItemToMarkdownPost)
  if (!!lastN) {
    mdPosts = mdPosts.slice(0, lastN)
  }


  await Promise.all(mdPosts.map(p => writeMarkdownPost(outputPath, { ...p, author: feed.author || p.author })))
})()
