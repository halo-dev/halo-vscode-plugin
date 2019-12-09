import { AxiosPromise } from "axios";
import service from "../config/service";

export interface BaseResponse<T> {
  status: number;
  message: string;
  devMessage?: string;
  data?: T;
}

export enum PostStatus {
  PUBLISHED,
  DRAFTED,
  DELETED
}

export interface Pageable {
  page?: number;
  size?: number;
  sort?: string[];
}

export interface QueryParam extends Pageable {
  categoryId?: number;
  keyword?: string;
  status?: PostStatus;
}

export interface PageResponse<T> {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: T[];
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

export interface IPostApi {
  list(
    queryParam: QueryParam
  ): AxiosPromise<BaseResponse<PageResponse<PostList>>>;
  get(id: number): AxiosPromise<BaseResponse<Post>>;
  update(id: number, updatedPost: Post): AxiosPromise<BaseResponse<Post>>;
}

export class PostApi implements IPostApi {
  private readonly baseUrl: string;

  constructor(domainUrl: string) {
    if (!domainUrl) {
      throw new Error("Domain url must not be blank");
    }
    if (domainUrl.endsWith("/")) {
      domainUrl = domainUrl.substring(0, domainUrl.length - 2);
    }
    this.baseUrl = domainUrl + "/api/admin/posts";
    console.log("Build post base url: " + this.baseUrl);
  }

  list(
    queryParam: QueryParam
  ): AxiosPromise<BaseResponse<PageResponse<PostList>>> {
    return service({
      url: this.baseUrl,
      params: queryParam,
      method: "get"
    });
  }
  get(id: number): AxiosPromise<BaseResponse<Post>> {
    return service({
      url: `${this.baseUrl}/${id}`,
      method: "get"
    });
  }
  update(id: number, updatedPost: Post): AxiosPromise<BaseResponse<Post>> {
    return service({
      url: `${this.baseUrl}/${id}`,
      data: updatedPost,
      method: "post"
    });
  }
}
