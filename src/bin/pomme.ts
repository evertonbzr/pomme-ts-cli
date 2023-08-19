#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { generatorSdk } from "../lib/generator";

const program = new Command();

program
  .name("pomme-cli")
  .description("CLI to some JavaScript pomme-ts package")
  .version("1.0.0");

program
  .command("generate")
  .description("generate a pomme-ts sdk")
  .option("--baseUrl <string>", "url from pomme-ts server", process.env.BASE_URL)
  .option("--hash <string>", "hash from pomme-ts server", null)
  .action((options) => {
    console.log("Generating the pomme-ts SDK...");

    generatorSdk({
      baseUrl: options.baseUrl,
      hash: options.hash,
    });

    console.log("SDK generation completed!");
  });

program.parse(process.argv);
