import * as vscode from "vscode";
import { Halo, IHalo } from "./Halo";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "vscode-ext-learning" is now active!'
  );

  const halo = new Halo();

  context.subscriptions.push(
    vscode.commands.registerCommand("halo.config.check", () => {
      checkHaloConfig(halo);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("halo.config.reload", () =>
      reloadHaloConfig(halo)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("halo.post.list", () => {
      halo.openPostLists().catch(error => {
        vscode.window.showErrorMessage(error.message);
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("halo.post.publish", () => {
      halo.handlePublish();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument(textDocumentWillSaveEvent => {
      halo
        .handleOnWillSaveTextDocument(textDocumentWillSaveEvent)
        .then(post => {
          if (post) {
            // Show info message
            vscode.window.showInformationMessage("同步成功");
          }
        })
        .catch(error => {
          console.log("Failed to update post", error);
          vscode.window.showErrorMessage(error.message);
        });
    })
  );
}

function checkHaloConfig(halo: IHalo) {
  halo
    .getConfig()
    .then(haloConfig => {
      console.log(`Got halo config: ${JSON.stringify(haloConfig)}`);
      vscode.window.showInformationMessage("配置文件加载成功！");
    })
    .catch(error => {
      console.error("Outter error reason: ", error);
      vscode.window.showErrorMessage(error.message);
    });
}

function reloadHaloConfig(halo: IHalo) {
  halo.resetHalo();
  checkHaloConfig(halo);
}

// this method is called when your extension is deactivated
export function deactivate() {}
