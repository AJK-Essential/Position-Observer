const fs = require("fs");
const path = require("path");

// fs.cp("./src/**/*.js", "./docs", { recursive: true }, (err) => {
//   if (err) {
//     console.error(err);
//   }
// });

// const toBeCopiedFileExtensions = ['']

// const createFileContent = (codeImportPath, htmlFile, htmlFileContent) => {
//   // const htmlFileContent =
// };

const copyFiles = (srcPath, destFilePath) => {
  fs.copyFileSync(srcPath, destFilePath);
};

const getFullFilePath = (folderPath, fileName) => {
  return path.join(__dirname, folderPath, fileName);
};

const getFullFolderPath = (folderPath) => {
  return path.join(__dirname, folderPath);
};

const copyDemoFilesToDocsSubFolder = (docsSubFolderPath) => {
  fs.readdirSync("./demo-files").forEach((fileName, index) => {
    const srcPath = getFullFilePath("./demo-files", fileName);
    const destFilePath = path.join(
      getFullFolderPath(docsSubFolderPath),
      fileName
    );

    console.log(
      index + 1,
      ".",
      "\tSource\t\t: ",
      srcPath,
      "\n\tDestination\t: ",
      destFilePath,
      "\n"
    );
    copyFiles(srcPath, destFilePath);
  });
};

// console.log(fs.readdirSync("./demo-files")).filter(file => );

const readDocsFolderNames = () => {
  fs.readdirSync("./docs").forEach((folderName) => {
    copyDemoFilesToDocsSubFolder(`./docs/${folderName}`);
  });
};

readDocsFolderNames();
