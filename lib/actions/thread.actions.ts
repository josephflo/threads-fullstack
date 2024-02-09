"use server";

import { revalidatePath } from "next/cache";
import Thread from "../models/threads.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

export async function createThread({ text, author, comunityId, path }: Params) {
  try {
    connectToDB();

    //createThread
    const createdThread = await Thread.create({
      text,
      author,
      comunity: null,
    });

    //update user model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    revalidatePath(path);
  } catch (error: any) {
    console.log(error.message);

    throw new Error(`Cant create thread. Error: ${error.message}`);
  }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();
  const skipAmount = (pageNumber - 1) * pageSize;

  const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({ path: "author", model: User })
    .populate({
      path: "children",
      populate: {
        path: "author",
        model: User,
        select: "_id name parentId image",
      },
    });

  const totalPostCount = await Thread.countDocuments({
    parentId: { $in: [null, undefined] },
  });

  const posts = await postsQuery.exec();

  const isNext = totalPostCount > skipAmount + posts.length;

  return { posts, isNext };
}

export async function fetchThreadById(id: string) {
  connectToDB();

  try {
    const thread = await Thread.findById(id)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      })
      .populate({
        path: "children",
        populate: [
          {
            path: "author",
            model: User,
            select: "_id id name parentId image",
          },
          {
            path: "children",
            model: Thread,
            populate: {
              path: "author",
              model: User,
              select: "_id idname parentId image",
            },
          },
        ],
      })
      .exec();
    return thread;
  } catch (error: any) {
    console.error("Error while fetching thread:", error);
    throw new Error("Unable to fetch thread");
  }
}

export async function addComment(
  threadId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB();
  try {

    // Find the original thread by its ID
    const originalThread = await Thread.findById(threadId)
    if(!originalThread){
      throw new Error('Thread not found')
    }

    //create a new thread with a comment text
    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId
    })
    
    //save new thread
    const savedCommentThread = await commentThread.save()

    //update original thread to include the new comment
    originalThread.children.push(savedCommentThread._id)

    //save the original thread
    await originalThread.save()
    revalidatePath(path)
  } catch (error:any) {
    throw new Error(`Error adding comment to thread: ${error.message}`)
  }
}
