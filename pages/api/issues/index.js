import { Octokit } from "octokit";
import fs from "fs";
import path from "path";
import { Novu } from "@novu/node";

const novu = new Novu(process.env.NOVU_TOKEN);

export default async function handler(req, res) {
  const { send } = req.query;
  const q = "is:open is:issue label:good-first-issue";
  const octokit = new Octokit();

  const response = await octokit.request("GET /search/issues", {
    q,
  });

  const results = response.data.items.map((item) => ({
    title: item.title,
    author: item.user.login,
    labels: item.labels.map((label) => label.name),
    url: item.html_url,
  }));
  const random = Math.floor(Math.random() * (results.length + 1));
  const issue = results[random];

  if (send) {
    const files = fs.readdirSync(path.resolve("data"));
    const users = files.map((file) => ({
      ...JSON.parse(fs.readFileSync(path.resolve("data", file), "utf8")),
      file,
    }));

    users.forEach((user) => {
      novu.trigger("good-first-issue", {
        to: {
          subscriberId: user.email,
          email: user.email,
        },
        payload: {
          name: user.name,
          title: issue.title,
          author: issue.author,
          labels: issue.labels.join(", "),
          url: issue.url,
        }
      });
    });
  }

  res.status(200).json(issue);
}
