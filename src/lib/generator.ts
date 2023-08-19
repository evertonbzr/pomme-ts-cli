import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import ejs from "ejs";
import { JSONSchema, compile } from "json-schema-to-typescript";
import axios from "axios";

function capitalizeString(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getRoutesFormated(routes: string[]) {
  const fields = routes.map((line) => {
    const keyRegex = /<@key>(.*?)<\/@key>/;
    const reqRegex = /<@req>(.*?)<\/@req>/;
    const routeRegex = /<@route>(.*?)<\/@route>/;
    const bodyRegex = /<@body>(.*?)<\/@body>/;
    const queryRegex = /<@query>(.*?)<\/@query>/;

    const keyMatch = line.match(keyRegex);
    const reqMatch = line.match(reqRegex);
    const routeMatch = line.match(routeRegex);
    const bodyMatch = line.match(bodyRegex);
    const queryMatch = line.match(queryRegex);

    const keyValue = keyMatch ? keyMatch[1] : null;
    const reqValue = reqMatch ? reqMatch[1] : null;
    const routeValue = routeMatch ? routeMatch[1] : null;
    const bodyValue = bodyMatch ? bodyMatch[1] : null;
    const queryValue = queryMatch ? queryMatch[1] : null;

    return {
      key: keyValue,
      req: reqValue,
      route: routeValue,
      body: bodyValue,
      query: queryValue,
    };
  });

  return fields;
}

function getFormatedSchema(schema: ReturnType<typeof getRoutesFormated>) {
  const mappedSchema = schema.reduce((acc, crr) => {
    const { key, req, route, body, query } = crr;

    const paramsSchema = {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    };

    const matches = [...route.matchAll(/:(\w+)/g)];

    if (matches.length) {
      paramsSchema.properties = matches.reduce((acc, match) => {
        return {
          ...acc,
          [match[1]]: {
            type: "string",
          },
        };
      }, {});
      paramsSchema["required"] = matches.map((match) => match[1]);
    }

    const method = req as any;

    const required = [
      ...(body ? ["body"] : []),
      ...(query ? ["query"] : []),
      ...(Object.keys(paramsSchema.properties).length ? ["params"] : []),
    ];

    const newAcc = {
      ...acc,
      [key]: {
        method,
        data: {
          type: "object",
          properties: {
            ...(body ? { body: JSON.parse(body) } : {}),
            ...(query ? { query: JSON.parse(query) } : {}),
            ...(Object.keys(paramsSchema.properties).length
              ? { params: paramsSchema }
              : {}),
          },
          additionalProperties: false,
          $schema: "http://json-schema.org/draft-07/schema#",
          ...(required.length > 0 && { required }),
        },
        route,
      },
    };

    return newAcc;
  }, {});

  return mappedSchema;
}

export async function generatorSdk({
  baseUrl,
  hash,
}: {
  baseUrl: string;
  hash?: string;
}) {
  let routes;

  if (hash) {
    routes = await axios
      .get(`${baseUrl}/pomme/${hash}`)
      .then((res) => res.data)
      .catch((err) => {
        console.log("pomme-ts server not running");
      });
  } else {
    routes = await axios
      .get(`${baseUrl}/pomme`)
      .then((res) => res.data)
      .catch((err) => {
        console.log("pomme-ts server not running");
      });
  }

  if(!routes) {
    throw new Error('pomme-ts server not running')
  }

  const routesFormated = getRoutesFormated(routes.payload);
  const schema = getFormatedSchema(routesFormated);

  let typesData = {};
  const implementationData = [];

  const keys = Object.keys(schema);

  for (const key of keys) {
    const nameType = `${capitalizeString(key)}Args`;

    const content = await new Promise((resolve, reject) => {
      compile(schema[key].data as JSONSchema, nameType)
        .then((ts) => {
          resolve(ts);
        })
        .catch((err) => {
          reject(err);
        });
    });

    typesData = {
      ...typesData,
      [nameType]: content,
    };
  }

  for (const key of keys) {
    const nameType = `${capitalizeString(key)}Args`;

    const haveArgs = typesData[nameType].match(/Args {}/gm)
      ? ""
      : `args: ${nameType}`;

    const queryMatch = typesData[nameType].match(/query:/)
      ? `args.query`
      : `null`;
    const bodyMatch = typesData[nameType].match(/body:/) ? `args.body` : `null`;

    const paramsMatch = typesData[nameType].match(/params:/)
      ? `
  const params = args.params;

  for (const paramKey in params) {
    if (params.hasOwnProperty(paramKey)) {
      const value = params[paramKey];
      path = path.replace(\`:\${paramKey}\`, value.toString());
   }
  }
    `
      : `
      `;

    const functionMethod = `
export function ${key}(${haveArgs}) {
  let path = '${schema[key].route}';
  ${paramsMatch}
  return axiosInstance({
    method: "${schema[key].method.toLowerCase()}",
    data: ${bodyMatch},
    params: ${queryMatch},
    url: path,
  });
}`;

    implementationData.push(functionMethod);
  }

  const templateData = {
    baseUrl,
    types: Object.values(typesData),
    implementationData,
    keysImpl: keys,
  };

  const templateContent = readFileSync(
    join(__dirname, "../templates", "sdk-template.ejs"),
    "utf-8"
  );

  const typeFile = ejs.render(templateContent, templateData);

  writeFileSync(join(process.cwd(), "sdk.ts"), typeFile);
}

generatorSdk({ baseUrl: "http://localhost:3000" });
