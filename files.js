const webFiles = {};

const fr = new FileReader();

function Upload() {
  const files = document.getElementById('file-chooser').files;

  Object.values(files).forEach(file => {
    // console.log(file)
    const fr = new FileReader();

    fr.onload = (e) => {

      webFiles[file.name] = {name: file.name, content: e.target.result};

      AddFileToList(file.name);
    }

    fr.readAsText(file)
  });
}

function AddFileToList(filename) {
  const node = document.createElement("li");
  const link = document.createElement("a");
  link.href = "#";
  link.setAttribute("onclick", `File_Onclick('${filename}')`);

  const textnode = document.createTextNode(filename);

  link.appendChild(textnode)
  node.appendChild(link);
  document.getElementById("file-list").appendChild(node);
}

function File_Onclick(filename) {
  const file = new File([webFiles[filename].content], filename, {
    type: 'text/plain',
  })

  Download(file);
}

function Export(type) {

  let content = '';

  if (type == "pseudocode.txt") {
    content = document.getElementById('editor').value;
  } else if (type == "output.txt") {
    content = document.getElementById('output').value;
  } else {
    content = JS_Script;
  }

  const file = new File([content], type, {
    type: 'text/plain',
  })

  Download(file);
}

function Download(file) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(file)

  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function OpenScript() {

  const [file] = document.getElementById('script-upload').files;

  const fr = new FileReader();

  fr.onload = (e) => {
    document.getElementById('editor').value = e.target.result;
  }

  fr.readAsText(file)
}

function AddNewFile(filename) {

  if (webFiles[filename]) {
    webFiles[filename].content = '';
  } else {
    webFiles[filename] = {filename, content: ''};
    AddFileToList(filename);
  }
}