import { Bot, Post } from "@skyware/bot";
import { addLabelToUser, deleteAllLabels, fetchCurrentLabels } from "./labeler";
import dedent from "dedent";

const bot = new Bot();

try {
  await bot.login({
    identifier: Bun.env.BSKY_USERNAME as string,
    password: Bun.env.BSKY_PASSWORD as string,
  });
} catch (error) {
  console.log("There was an error logging in to bluesky", error);
}

process.stdout.write(
  "WARNING: This will delete all posts in your profile. Are you sure you want to continue? (y/n) ",
);

const answer = await new Promise((resolve) => {
  process.stdin.once("data", (data) => {
    resolve(data.toString().trim().toLowerCase());
  });
});

if (answer === "y") {
  const postsToDelete = await bot.profile.getPosts();
  for (const post of postsToDelete.posts) {
    await post.delete();
  }
  console.log("All posts have been deleted.");
} else {
  console.log("Operation cancelled.");
  process.exit(0);
}

const post = await bot.post({
  text: "Like the replies to the posts below to receive a label",
  threadgate: { allowLists: [] },
});

const alliancePost = await post.reply({
  text: dedent`
    Like this post to receive this label on your account:

    "For the Alliance!"
  `,
});

const hordePost = await post.reply({
  text: dedent`
    Like this post to receive this label on your account:

    "Lok'Tar Ogar!"
  `,
});

const postsToIndentifier: Record<string, string> = {
  [alliancePost.uri]: "for-the-alliance",
  [hordePost.uri]: "lok-tar-ogar",
};

bot.on("like", async (event) => {
  try {
    if (
      event.subject instanceof Post &&
      event.subject.text.includes("remove all labels")
    ) {
      const labels = fetchCurrentLabels(event.user.did);
      deleteAllLabels(event.user.did, labels);
      return;
    }

    if (event.subject instanceof Post) {
      const indentifier = postsToIndentifier[event.subject.uri];

      if (indentifier) addLabelToUser(event.user.did, indentifier);
    }
  } catch (error) {
    console.error(error);
  }
});

// event.user.did
// only cares about labels applied by this account
