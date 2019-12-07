import { AxiosPromise } from "axios";
import service from "../util/service";

const baseUrl = "/api/admin/posts";

export enum PostStatus {
  PUBLISHED,
  DRAFTED,
  DELETED
}

export interface Pageable {
  page: number;
  size: number;
  sort: string;
}

export interface PostList {
  id: number;
  title: string;
  status: PostStatus;
  url: string;
  summary: string;
  updateTime: number;
  createTime: number;
  editTime: number;
}

export interface Post extends PostList {
  originalContent: string;
  formatContent: string;
}

interface IPostApi {
  list(pageable: Pageable): AxiosPromise<PostList>;
  get(id: number): AxiosPromise<Post>;
  update(postId: number, updatedPost: Post): AxiosPromise<Post>;
}

class PostApi implements IPostApi {
  list(pageable: Pageable): AxiosPromise<PostList> {
    return service({
      url: baseUrl,
      params: pageable,
      method: "get"
    });
  }
  get(id: number): AxiosPromise<Post> {
    return service({
      url: `${baseUrl}/${id}`,
      method: "get"
    });
  }
  update(postId: number, updatedPost: Post): AxiosPromise<Post> {
    throw new Error("Method not implemented.");
  }
}

export default PostApi;
