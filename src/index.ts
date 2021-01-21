import minimist from 'minimist'
import Parser from 'rss-parser';
import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os';
import TOML from '@iarna/toml'




const args = minimist(process.argv.slice(2))

const inputRSS: string = args.in
const outputPath: string = args.out

if (args.help || !inputRSS || !outputPath) {
  console.log(`Usage: ${process.argv0} ${process.argv[1]} --in <RSS-URL> --out <local-folder>`)
  process.exit(args.help ? 0 : 1)
}

type MarkdownPost = {
  title: string
  originalLink: string
  pubDate: Date,
  author: string,
  content: string,
  contentSnippet: string,
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
    contentSnippet,
  } = item

  if (!title || !link || !content || !contentSnippet || !pubDate) {
    throw new Error("Feed item is missing required attribute")
  }

  return {
    title,
    originalLink: link,
    pubDate: new Date(pubDate),
    author,
    content,
    contentSnippet,
  }
}

async function writeMarkdownPost(outDir: string, { title, author, originalLink, contentSnippet, content, pubDate }: MarkdownPost) {
  const mdContent = `
+++
${TOML.stringify({
    title,
    author,
    originalLink,
    date: pubDate,
    summary: contentSnippet,
  })}
+++
${content}
`
  await fs.writeFile(path.join(outDir, `${author}-${title}.md`), mdContent)
}

const parser = new Parser<{}, ExtraFields>();
(async () => {

  const feed = await parser.parseURL(inputRSS);
  // console.log("Feed is: ", new Set(feed.items.map(i => Object.keys(i))))
  // console.log("Feed is: ", feed.items[0])
  const mdPosts = feed.items.map(feedItemToMarkdownPost)
  await writeMarkdownPost(outputPath, mdPosts[0])
})()
