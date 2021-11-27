import { ActionFunction, EVMcrispr } from "src";
import { normalizeActions } from "./helpers";

class EvmclParser {
  env: Map<string, string> = new Map();
  evmcrispr: EVMcrispr;
  constructor(evmcrispr: EVMcrispr) {
    this.evmcrispr = evmcrispr;
  }

  /**
   * Saves an evmcl environment variable
   * @param varName Variable name, must start with $
   * @param value Parsed value to be stored
   */
  set(varName: string, parsedArgs: string) {
    if (varName[0] !== "$") {
      throw new Error("Environment variables must start with $ symbol.");
    }
    this.env.set(varName, parsedArgs);
  }

  /**
   * Parse an array of arguments that may include environment variables, extensions, or nested arrays
   * @param args Array of arguments in form of strings
   * @returns An array of parsed values ready for EVMcrispr
   */
  async args(args: string[]): Promise<any[]> {
    return this.#recursiveArgParse(args.map(this.#array, this));
  }

  /**
   * Parse argument resolving environment variables ($) and extensions (@)
   * @param arg Argument to be processed
   * @returns Parsed value
   */
  async arg(arg: string): Promise<string> {
    if (arg && arg[0] == "$") {
      return this.#env(arg);
    } else if (arg && arg[0] == "@") {
      return this.#extension(arg);
    }
    return arg;
  }

  /**
   * Parse string to boolean or undefinied
   * @param arg Either "true", "false", or undefinied
   * @returns True, false, or undefinied
   */
  static bool(arg: string): boolean | undefined {
    if (arg !== undefined && arg !== "true" && arg !== "false") {
      throw new Error("Argument must be a boolean or undefined. It is: " + arg);
    }
    return arg ? arg === "true" : undefined;
  }

  /**
   * Parse evmcl argument to array. Converts something like "[[0x00,0x01],[0x03]]" to [["0x00","0x01"],["0x03"]]
   * @param arg String with an encoded array
   * @returns Nested array of strings or the argument itself if it is not an encoded array
   */
  #array(arg: string): any {
    if (arg.startsWith("[")) {
      return JSON.parse(
        arg
          .replace(/\[(?!\[)/g, '["')
          .replace(/(?<!\]),/g, '",')
          .replace(/,(?!\[)/g, ',"')
          .replace(/(?<!\])\]/g, '"]')
      );
    }
    return arg;
  }

  #env(varName: string): string {
    if (!this.env.has(varName)) {
      throw new Error(`Environment variable ${varName} not defined.`);
    } else {
      return this.env.get(varName)!;
    }
  }

  #extension(arg: string): Promise<string> {
    const [, ext, ...params] = arg.match(/^@([a-zA-Z0-9.]+)(?:\(([^,]+)(?:,([^,]+))*\))?$/)!;
    return this.#resolve(ext)(this.evmcrispr, ...params.map(this.arg, this));
  }

  #resolve(ext: string) {
    return ext.split(".").reduce((obj: any, key: string) => obj[key], this.evmcrispr.extensions);
  }

  async #recursiveArgParse(arg: any): Promise<any> {
    return Array.isArray(arg) ? await Promise.all(arg.map(this.#recursiveArgParse, this)) : this.arg(arg);
  }
}

export default function evmcl(strings: TemplateStringsArray, ...keys: string[]): (evm: EVMcrispr) => ActionFunction {
  const input = strings[0] + keys.map((key, i) => key + strings[i + 1]).join("");
  const commands = input
    .split("\n")
    .map((command) => command.split("#")[0])
    .map((command) => command.split("//")[0])
    .map((command) => command.trim())
    .filter((command) => !!command);
  return (evmcrispr: EVMcrispr) => {
    const parse = new EvmclParser(evmcrispr);
    return normalizeActions(
      commands.map((command) => {
        const [commandName, ...args] = command.split(" ");
        switch (commandName) {
          case "install":
            return async () => {
              const [identifier, ...initParams] = await parse.args(args);
              return evmcrispr.install(identifier, initParams)();
            };
          case "grant":
            return async () => {
              const [grantee, app, role, defaultPermissionManager] = await parse.args(args);
              return evmcrispr.grant([grantee, app, role], defaultPermissionManager)();
            };
          case "revoke":
            return async () => {
              const [grantee, app, role, removePermissionManager] = await parse.args(args);
              return evmcrispr.revoke([grantee, app, role], EvmclParser.bool(removePermissionManager))();
            };
          case "exec":
            return async () => {
              const [identifier, method, ...params] = await parse.args(args);
              return evmcrispr.exec(identifier)[method](...params)();
            };
          case "act":
            return async () => {
              const [agent, target, signature, ...params] = await parse.args(args);
              return evmcrispr.act(agent, target, signature, params)();
            };
          case "set":
            return async () => {
              const [varName, ...rest] = args;
              parse.set(varName, (await parse.args(rest)).join(""));
              return [];
            };
          default:
            throw new Error("Unrecognized command: " + commandName);
        }
      })
    );
  };
}
