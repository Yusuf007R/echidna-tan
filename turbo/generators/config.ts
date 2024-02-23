import { PlopTypes } from "@turbo/gen";

// Learn more about Turborepo Generators at https://turbo.build/repo/docs/core-concepts/monorepos/code-generation

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // A simple generator to add a new React component to the internal UI library
  plop.setGenerator("react-component", {
    description: "Adds a new react component",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the component?",
      },
      {
        type: "input",
        name: "location",
        message: "Where should the component be located? (ui, web)",

        validate(tempInput, answers) {
          let input = "web";
          if (typeof tempInput !== "string") return "Please enter a string";
          if (tempInput) input = tempInput;
          if (input.toLowerCase() !== "ui" && input.toLowerCase() !== "web") {
            return "Please enter either 'UI Lib' or 'Web App'";
          }
          const dashName = answers?.name
            ?.split(/(?=[A-Z])/)
            .join("-")
            .toLowerCase();

          const componentPath = `/components/${dashName}/index.tsx`;
          const uiPath = "./packages/ui" + componentPath;
          const webPath = "./apps/web/src" + componentPath;
          if (answers)
            answers.path = input.toLowerCase() === "ui" ? uiPath : webPath;
          return true;
        },
      },
    ],
    actions: [
      {
        type: "add",
        path: `{{path}}`,
        templateFile: "templates/component.hbs",
      },
    ],
  });
}
