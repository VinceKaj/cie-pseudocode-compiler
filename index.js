const fs = require('fs');

const error = (str) => { throw(`Error at script.pc:${processedLines.length-7}: ${str}`) };

const ReservedWords = [
  'APPEND', 'ARRAY', 'BOOLEAN', 'CALL', 'CHAR', 'CLOSEFILE', 'CONSTANT', 'DECLARE', 'DIV', 'ELSE', 'ENDFUNCTION', 'ENDPROCEDURE', 'ENDWHILE', 'FOR', 'FUNCTION', 'IF', 'INPUT', 'INTEGER', 'MOD', 'NEXT', 'OPENFILE', 'OUTPUT', 'PROCEDURE', 'READ', 'READFILE', 'REAL', 'RETURN', 'RETURNS', 'STRING', 'THEN', 'TO', 'TYPE', 'WHILE', 'WRITE', 'WRITEFILE'
]

function ChecksConstructor() {
  this.files = {};
  this.vars = {};
  this.functions = {};

  this.addVar = (name, value, type, constant=false) => {
    if (ReservedWords.includes(name)) error(`Identifier cannot have name ${name}`);
    if (this.vars[name]) error(`Cannot re-define identifier '${split[1]}'.`);
    this.vars[name] = {value: value, type: type, constant: constant};
  };

  this.addFile = (name, state) => {
    if (!["READ", "WRITE", "APPEND"].includes(state)) error(`No such file operator '${state}'`);
    if (this.files[name] && this.files[name].state !== "closed") error('Cannot open an already open file');
    this.files[name] = {state: state};
  }

  this.closeFile = (name) => {
    if (!this.files[name] || this.files[name].state === "closed")
      error("Cannot close a file that isn't open");
    this.files[name].state = "closed";
  }
}

const GetFileName = (str) => {
  let match = str.match(/"(.+)"/); // try to match string filename. E.g.: "filename.txt"
  if (match)
    return `'${match[1]}'`; // return 'filename.txt'
  if (str.split(' ')[1]?.match(/[\w ]+/))
    return str.split(' ')[1]?.match(/[\w ]+/)[0]; // if there isn't a string, return it as a variable. E.g.: filename
  else return null;
}

const type = (x) => {
  if (typeof(x) === 'number')
    return (x % 1 === 0 ? 'int' : 'float');
  return typeof(x);
}

function ConvertType(type) {
  switch (type) {
    case "INTEGER": return "int";
    case "REAL": return "float"; // no way to differentiate
    case "STRING": return "string";
    case "BOOLEAN": return "boolean";
    default: error(`Type error: Unknown type '${type}'`);
  }
}

function ConvertLine(split) {

  const identifier = GetFileName(split.join(' '));

  switch (split[0]) {
    case "DECLARE": { 
      const type = ConvertType(split.pop());
      const vars = split.splice(1,split.length-2).join("").split(" , ");
      vars.forEach(v => checks.addVar(v, null, type));
      return `let ${vars.join(', ')}`;
    }
    case "CONSTANT": {
      let statement = split.join(' ').replace(/CONSTANT/, 'const').replace(/===/g, '=');
      let val = eval(statement + `; ${split[1]}`);
      checks.addVar(split[1], val, type(val), true); // saves the constant, to record its changes
      return `const ${split[1]} = ${type(val) === 'string' ? `"${val}"` : val}`;
    }
    case "PROCEDURE": {
      let match = split.join(' ').match(/\((.+)\)/);
      if (!match) return `function ${split[1]}() {`

      let parSplit = match[1].split(' , ');
    
      parameters = [];
      parSplit.forEach(param => {
        let varSplit = param.split(' ');
        let varName = (['BYREF', 'BYVAL'].includes(varSplit[0]) ? varSplit[1] : varSplit[0]); // if there's a BYREF or BYVAL, ignore it
        let varType = ConvertType(varSplit.pop());
        checks.vars[varName] = {type: varType, value: null, constant: false}; // save variable to compiler (TODO: scoping)
        parameters.push(varName);
      });

      return `function ${split[1]}(${parameters}) {` // make function header with all paramters
    }
    case "CALL": {
      return `${split.slice(1,split.length).join('')}`;
    }
    case "FUNCTION": {
      
    }
    case "IF": {
      return `if(${split.slice(1, split.length-1).join(' ')})`;
    }
    case "FOR": {
      let toIndex = split.indexOf('TO');
      return `for(${split.slice(1,toIndex).join(' ')}; ${split[1]} <= ${split[5]}; ${split[1]}++) {`;
    }
    case "WHILE": {
      return `while(${split.slice(1, split.length).join(' ')}) {`;
    }
    case "OUTPUT": {
      return `console.log(${split.slice(1,split.length).join(' ')})`;
    }
    case "OPENFILE": {
      checks.addFile(identifier, split.pop());

      if (checks.files[identifier].state === "READ")
        return `_[${identifier}] = require("fs").readFileSync(${identifier}, {encoding: "utf-8"}).split("\\n")`; // no JS code for opening files
      else if (checks.files[identifier].state === "WRITE")
        return `require("fs").writeFileSync(${identifier}, "", {encoding: "utf-8"})`;
      else (checks.files[identifier].state === "APPEND")
        return "";
    }
    case "CLOSEFILE": {
      checks.closeFile(identifier);
      return `_[${identifier}] = null`; // no JS code for closing files
    }
    case "READFILE": {
      if (!checks.files[identifier] || checks.files[identifier].state != "READ")
        error("Cannot read file that is not open for reading");
      return `${split[3]} = _[${identifier}].splice(0, 1)[0]`; // "read one line"
    }
    case "WRITEFILE": {
      if (!checks.files[identifier] || checks.files[identifier].state != "WRITE")
        error("Cannot write to file that is not open for writing");

      let dataToWrite = split.join(' ').match(/(?<=, ).+/);
      if (dataToWrite)
        return `require("fs").appendFileSync(${identifier}, ${dataToWrite[0]}+'\\n')`;
      else
        error("Incomplete WRITEFILE statement: missing data");
    }
    default:
      return split.join(' ');
  }
}

let pcLines = fs.readFileSync('script.pc', {encoding: 'utf-8'}).split('\n');

let processedLines = [
  "/* Built-in pseudocode functions */",
  "const MID = (str, start, end) => str.slice(start-1, end+1);",
  "const LEFT = (str, end) => str.slice(0, end+1);",
  "const RIGHT = (str, end) => str.slice(str.length-2, end+1);",
  "const LENGTH = (element) => element.length;",
  "\n/* Compiler variables */",
  "let _ = {};",
  "\n/* Translated begins here code */"
];

let checks = new ChecksConstructor(); // this will help with error detection

pcLines.forEach(pcLine => {

  /* Formating */
  pcLine = pcLine.replace(/\/\/.*/g, ''); // remove all comments
  pcLine = pcLine.replace(/(?:  )+/g, ''); // remove double spaces (indentation)
  pcLine = pcLine.replace(/(?<=\w)\(/, " ("); // add space margin for front parentheses
  pcLine = pcLine.replace(/(?<=\w)\)/, ") "); // add space margin for back parentheses
  pcLine = pcLine.replace(/[ +]?,[ +]?/g, " , "); // add spaces around commas ('a,b' -> 'a , b')

  /*** REPLACES ***/
  // Operators
  pcLine = pcLine.replace(/MOD/g, '%');
  pcLine = pcLine.replace(/=/g, '===');
  pcLine = pcLine.replace(/&/g, "+");
  pcLine = pcLine.replace(/NOT/g, "!");
  pcLine = pcLine.replace(/AND/g, "&&");
  pcLine = pcLine.replace(/OR/g, "||");

  // Assignment checks (constant assignment, data type checks, declaration checks)
  if (pcLine.includes('<-')) {
    let split = pcLine.split(' ');

    if (!checks.vars[split[0]])
      error(`Cannot assign value to undeclared variable '${split[0]}'`);
    else if (checks.vars[split[0]].constant)
      error(`Cannot assign value to constant variable '${split[0]}'`);

    const val = pcLine.match(/(?<=(?:\<-[ ?])).+/); // match everything after the '<-'
    if (checks.vars[split[0]].type !== typeof(val))
      error(`Cannot assign value to identifier '${split[0]}' of a different data type`);
  
    checks.vars[split[0]].value = val;
    pcLine = pcLine.replace(/<-/, '=');
  }

  // Functions
  pcLine = pcLine.replace(/ENDPROCEDURE/, '}');
  pcLine = pcLine.replace(/ENDFUNCTION/, '}');

  // Loops
  pcLine = pcLine.replace(/NEXT .+/g, '}');
  pcLine = pcLine.replace(/ENDWHILE/g, '}');

  // IFs
  pcLine = pcLine.replace(/ENDIF/g, '}');
  pcLine = pcLine.replace(/THEN/g, '{');

  let jsLine = ConvertLine(pcLine.split(' '));

  // EOFs (need to be replaced after line conversion)
  if (jsLine.match(/EOF \([^\)]+\)/g)) {
    jsLine.match(/EOF \([^\)]+\)/g).forEach(e => {
      let identifier = GetFileName(e); // either filename, or variable

      if (!checks.files[identifier]) {
        error("Cannot read EOF of unopened file");
      }

      if (checks.files[identifier].state != "READ")
        error("Cannot read EOF of file not open for reading.");
      // EOF(identifier) -> check length of file array
      jsLine = jsLine.replace(e, `(_[${identifier}].length === 0)`);
    });
  }

  processedLines.push(jsLine);
});

/* Check if all files were closed at the end of the script */
Object.keys(checks.files).forEach(i => {
  if (checks.files[i].state != "closed")
    error("Cannot execute script with unclosed files.");
})

fs.writeFileSync('compiled.js', processedLines.join('\n'));