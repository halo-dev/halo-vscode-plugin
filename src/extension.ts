import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "vscode-ext-learning" is now active!'
  );

  let disposable = vscode.commands.registerCommand("halo.clear", () => {
    let workspace = vscode.workspace;
    let halo = new Halo();
    let haloConfig = halo.getConfig();
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

interface HaloConfig {
  blog_url: string;
  app_id: string;
  app_secret: string;
}

interface IHalo {
  getConfig(): HaloConfig;
}

class Halo implements IHalo {
  private haloConfigLocation: string = "./halo.json";

  getConfig(): HaloConfig {
    let workspace = vscode.workspace;
    workspace.findFiles("halo.json", null, 1).then(uris => {
      if (!uris || uris.length !== 1) {
        console.log("No configuration was found");
        vscode.window.showErrorMessage(
          "暂未找到 ./halo.json 配置文件，请自行创建后重试！"
        );
        return null;
      }

      console.log(`Got configuration file: ${uris[0]}`);
      workspace.openTextDocument(uris[0]).then(haloConfig => {
        // Parse configuration
        let config = <HaloConfig>JSON.parse(haloConfig.getText());
        if (!checkConfig(config)) {
          vscode.window.showErrorMessage("请配置完整");
          return;
        }

        vscode.window.showInformationMessage("配置文件加载成功！");

        console.log(
          `Got configuration: blog_url: ${config.blog_url}, app_id: ${config.app_id}, app_secret: ${config.app_secret}`
        );
      });
    });

    return <HaloConfig>(<unknown>null);
  }
}

function checkConfig(config: HaloConfig) {
  if (config && config.blog_url && config.app_id && config.app_secret) {
    return true;
  }
  return false;
}
