import * as vscode from "vscode";
import * as path from "path";
import { Post, PostApi, PostList, QueryParam, PostStatus } from "./api/post";
import { HaloConfig } from "./config/halo-config";
import { timeAgo } from "./util";

export interface IHalo {
  getConfig(): Promise<HaloConfig>;
  resetHalo(): void;
  testConfig(): boolean;
  listPost(): Promise<PostList[]>;
  openPostLists(): Promise<void>;
  handleOnWillSaveTextDocument(
    textDocumentWillSaveEvent: vscode.TextDocumentWillSaveEvent
  ): Promise<Post>;
  handlePublish(): void;
}

export class Halo implements IHalo {
  private readonly haloConfigName: string = "halo.json";

  private readonly postCache: Map<string, PostList> = new Map<
    string,
    PostList
  >();

  private haloConfig?: HaloConfig = undefined;

  private postApi?: PostApi = undefined;

  clearCache() {
    this.postCache.clear();
  }

  cachePost(posts: PostList[]) {
    // Clear cache before caching
    this.clearCache();

    if (!posts) {
      return;
    }

    posts.forEach(post => {
      this.postCache.set(post.title, Object.assign({}, post));
    });
  }

  async getPostCache() {
    if (this.postCache.size === 0) {
      const posts = await this.listPost();
      this.cachePost(posts);
    }
    return this.postCache;
  }

  async getPostApi(): Promise<PostApi> {
    if (this.postApi) {
      return this.postApi;
    }
    const haloConfig = await this.getConfig();
    return new PostApi(haloConfig.blog_url);
  }

  getConfig(): Promise<HaloConfig> {
    return new Promise((resolve, reject) => {
      if (this.testConfig()) {
        // If halo config has already went ready
        console.log("Got config from cache");
        resolve(this.haloConfig);
        return;
      }

      console.log("Try to get config from local file");

      // Find configuration file
      const workspace = vscode.workspace;
      workspace
        .findFiles(this.haloConfigName, "**​/node_modules/**", 1)
        .then(uris => {
          if (!uris || uris.length !== 1) {
            throw new Error(`请先创建 ${this.haloConfigName} 配置文件`);
          }

          return uris[0];
        })
        .then(haloConfigUri => {
          // Watch this config file
          this.watchConfigFile();

          console.log(`Got configuration file: ${haloConfigUri}`);

          return workspace.openTextDocument(haloConfigUri);
        })
        .then(configTextDocument => {
          // Parse configuration
          let config: HaloConfig | null;
          try {
            config = <HaloConfig>JSON.parse(configTextDocument.getText());
          } catch (error) {
            console.error(
              "Failed to parse json text:" + configTextDocument.getText()
            );
            throw new Error("配置文件格式有误");
          }

          // Cache halo config
          this.haloConfig = Object.assign({}, config);

          if (!this.testConfig()) {
            throw new Error("请完善配置信息");
          }

          vscode.window.showInformationMessage("配置文件加载成功！");

          resolve(this.haloConfig);
        })
        .then(undefined, error => {
          reject(error);
        });
    });
  }

  resetHalo(): void {
    this.haloConfig = undefined;
    this.postApi = undefined;
    this.clearCache();
    console.log("Reset config");
  }

  testConfig() {
    if (
      this.haloConfig &&
      this.haloConfig.blog_url &&
      this.haloConfig.app_id &&
      this.haloConfig.app_secret
    ) {
      return true;
    }
    return false;
  }

  ensureConfigred() {
    if (!this.testConfig()) {
      throw new Error("请正确配置配置文件");
    }
  }

  watchConfigFile() {
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
      `**/${this.haloConfigName}`
    );
    console.log("Halo config Watcher", fileSystemWatcher);
    fileSystemWatcher.onDidChange(uri => {
      console.log(`${uri.fsPath} file has been changed`);
      this.resetHalo();
    });
  }

  handleOnWillSaveTextDocument(
    textDocumentWillSaveEvent: vscode.TextDocumentWillSaveEvent
  ): Promise<Post> {
    return new Promise<Post>((resolve, reject) => {
      if (
        textDocumentWillSaveEvent.reason !==
        vscode.TextDocumentSaveReason.Manual
      ) {
        resolve();
        return;
      }
      const document = textDocumentWillSaveEvent.document;

      let title = this.getTitle(document.fileName);

      console.log(`Title: ${title}`);

      this.getPostCache()
        .then(postCache => {
          if (!title) {
            // Ignore it
            resolve();
            return;
          }
          const post = postCache.get(title);
          if (!post) {
            resolve();
            return;
          }

          return post;
        })
        .then(post => {
          if (!post) {
            return;
          }

          console.log("Updating post", post);
          return this.getPostApi()
            .then(postApi => {
              // TODO Update post
              const content = document.getText(this.getFullRange(document));
              return postApi.updateContent(post.id, content);
            })
            .then(response => {
              return response.data.data;
            })
            .then(updatedPost => {
              console.log("Updated post", updatedPost);
              resolve(updatedPost);
            });
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  listPost(): Promise<PostList[]> {
    let queryParam: QueryParam = {
      page: 0,
      size: 100,
      sort: ["editTime,desc"]
    };
    return new Promise((resolve, reject) => {
      this.getPostApi()
        .then(postApi => {
          return postApi.list(queryParam);
        })
        .then(response => {
          if (!response.data.data) {
            throw new Error("获取文章列表失败");
          }
          return response.data.data.content;
        })
        .then(posts => {
          resolve(posts);
        })
        .catch(error => {
          this.clearCache();
          reject(error);
        });
    });
  }

  openPostLists() {
    return this.listPost()
      .then(posts => {
        return this.convertPostsToQuickPickItems(posts);
      })
      .then(quickPickItems => {
        const option: vscode.QuickPickOptions = {
          placeHolder: "请选择需要编辑的文章",
          matchOnDescription: true
        };

        console.log("Built items", quickPickItems);

        vscode.window
          .showQuickPick(quickPickItems, option)
          .then(quickPickItem => {
            console.log("Selected quick pick item", quickPickItem);
            if (!quickPickItem) {
              return;
            }
            const postId = (<any>quickPickItem).id;
            console.log("Opening post with id: " + postId);
            this.handleSelectedPost(postId);
          });
      });
  }

  getPost(id: number): Promise<Post> {
    return new Promise((resolve, reject) => {
      this.getPostApi()
        .then(postApi => {
          return postApi.get(id);
        })
        .then(response => {
          let post = response.data.data;
          console.log("Got post with id: " + id, post);

          if (!post) {
            reject(new Error("Failed to fetching post with id: " + id));
          } else {
            resolve(post);
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  handlePublish() {
    // Get current active editor
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    let title = this.getTitle(editor.document.fileName);

    console.log("Got title", title);
    if (!title) {
      return;
    }

    // Get filename

    this.getPostCache()
      .then(postCache => {
        if (!title) {
          return;
        }
        return postCache.get(title);
      })
      .then(post => {
        if (!post) {
          return;
        }
        console.log("Got publishing post", post);
        if (!post) {
          return;
        }

        console.log("Publishing post", post);

        return this.publish(post.id).then(publishedPost => {
          vscode.window.showInformationMessage("发布成功");
        });
      })
      .catch(error => {
        console.log(error.response);
        if (error.response) {
          vscode.window.showErrorMessage(error.response.data.message);
        } else {
          vscode.window.showErrorMessage(error.message);
        }
      });
  }

  getTitle(filename: string) {
    let basename = path.basename(filename);
    if (!basename.endsWith(".md")) {
      // Ignore it
      return null;
    }

    return basename.substring(0, basename.length - 3);
  }

  publish(postId: number) {
    return this.getPostApi()
      .then(postApi => {
        return postApi.updateStatus(PostStatus.PUBLISHED, postId);
      })
      .then(response => {
        return response.data.data;
      });
  }

  handleSelectedPost(id: number) {
    this.getPost(id).then(post => {
      // Create a markdown file
      const workspaceEdit = new vscode.WorkspaceEdit();
      const postUri = vscode.Uri.parse(
        `${this.getRootPath()}/${post.title}.md`
      );

      console.log("Try to create post file", postUri);
      // Delete file, and ignore if not exists
      // workspaceEdit.deleteFile(postUri, { ignoreIfNotExists: true });
      // Create file
      workspaceEdit.createFile(postUri, { overwrite: false });

      vscode.workspace
        .applyEdit(workspaceEdit)
        .then(edited => {
          console.log("Created post file", postUri);
          return vscode.workspace.openTextDocument(postUri);
        })
        .then(postDocument => {
          return vscode.window.showTextDocument(postDocument);
        })
        .then(postEditor => {
          const fullRange = this.getFullRange(postEditor.document);

          if (postEditor.document.getText(fullRange) === post.originalContent) {
            // Check content diff
            console.log("Same content! No content will be updated");
            return;
          }

          // Replace content
          postEditor
            .edit(editBuilder => {
              editBuilder.replace(fullRange, post.originalContent);
            })
            .then(edited => {
              if (edited) {
                console.log("Saving document");
                postEditor.document.save().then(saved => {
                  if (saved) {
                    console.log("Saved document");
                  } else {
                    console.log("Ignored saving document");
                  }
                });
              }
            });
        });
    });
  }

  convertPostsToQuickPickItems(posts: PostList[]): vscode.QuickPickItem[] {
    if (!posts) {
      return [];
    }
    return posts.map(post => {
      return <vscode.QuickPickItem>{
        label: `$(gist)\t${post.title}`,
        description: `最后编辑: ${timeAgo(post.editTime)}`,
        // detail: post.summary,
        id: post.id
      };
    });
  }

  getRootPath(): string {
    let folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      throw new Error("请先打开一个工作空间");
    }
    return folders[0].uri.fsPath;
  }

  getFullRange(document: vscode.TextDocument) {
    const firstLine = document.lineAt(0);
    const lastLine = document.lineAt(
      document.lineCount > 0 ? document.lineCount - 1 : 0
    );
    return new vscode.Range(
      0,
      firstLine.range.start.character,
      document.lineCount - 1,
      lastLine.range.end.character
    );
  }
}
