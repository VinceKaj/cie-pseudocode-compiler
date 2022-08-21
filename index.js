const fs = require('fs');

let lineCounter = 0;
const error = (str) => { throw(`Error at script.pc:${lineCounter}: ${str}`) };

const ReservedWords = [
  'APPEND', 'ARRAY', 'BOOLEAN', 'CALL', 'CHAR', 'CLOSEFILE', 'CONSTANT', 'DECLARE', 'DIV', 'ELSE', 'ENDFUNCTION', 'ENDPROCEDURE', 'ENDWHILE', 'FOR', 'FUNCTION', 'IF', 'INPUT', 'INTEGER', 'MOD', 'NEXT', 'OPENFILE', 'OUTPUT', 'PROCEDURE', 'READ', 'READFILE', 'REAL', 'RETURN', 'RETURNS', 'STRING', 'THEN', 'TO', 'TYPE', 'WHILE', 'WRITE', 'WRITEFILE'
];

const TypeOf = (x) => {
  try { x = eval(x) } catch (e) {} // convert string into actual value

  if (typeof(x) == 'string' && x.length == 1) return 'char';
  if (typeof(x) === 'number') return (x % 1 === 0 ? 'int' : 'float');
  return typeof(x);
}

const checks = {

  identifiers: {},

  identityCheck: (name) => {
    if (ReservedWords.includes(name)) error(`Identifier cannot have name ${name}`);
    if (checks.identifiers[name]) error(`Cannot re-define identifier '${name}'`);
  },

  addVar: (name, value, varType, constant=false) => {
    checks.identityCheck(name);
    if (value * 1 == value) value *= 1 // convert numbers into numbers
    
    checks.identifiers[name] = {prop: "var", value: value, type: (varType || TypeOf(value)), constant: constant};
  },

  addFile: (name, state) => {
    checks.identityCheck(name);
    if (!["READ", "WRITE", "APPEND"].includes(state)) error(`No such file operator '${state}'`);
    if (checks.identifiers[name].prop == "file" && checks.identifiers[name].state !== "closed")
      error('Cannot open an already open file');
    checks.identifiers[name] = {prop: "file", state: state};
  },

  closeFile: (name) => {
    if (!checks.identifiers[name] || checks.identifiers[name].prop == "file" && checks.identifiers[name].state === "closed")
      error("Cannot close a file that isn't open");
    checks.identifiers[name].state = "closed";
  },

  addArray: (name, type, min, max) => {
    checks.identityCheck(name);
    checks.identifiers[name] = {prop: "array", type: type, min: min, max: max};
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

function ConvertType(type) {
  switch (type) {
    case "INTEGER": return "int";
    case "REAL": return "float"; // no way to differentiate
    case "STRING": return "string";
    case "BOOLEAN": return "boolean";
    case "ARRAY": return "object";
    default: error(`Type error: Unknown type '${type}'`);
    // add custom Pseudocode types
  }
}

function ConvertLine(split) {

  const identifier = GetFileName(split.join(' '));
  let varType;

  switch (split[0]) {
    case "DECLARE": { 
      /* Deal with arrays */
      if (split.join(' ').includes("ARRAY")) {

        let [identifiers, ...typeArgs] = split.join(' ').split(/ ?\: ?/g); // colon split (space sensitive)
        identifiers = identifiers.split(/ ?, ?|DECLARE /g).splice(1); // comma split, remove "DECLARE"
        typeArgs = typeArgs.join(':').split(' '); // spaces 
        
        const arrType = ConvertType(typeArgs.pop());
        let [min, max] = typeArgs[1].match(/\d+/g);
        let returnArr = [ ];

        identifiers.forEach(i => {
          returnArr.push(`const ${i} = _.Array(${min}, ${max}, '${i}')`);
          checks.addArray(i, arrType, min, max);
        });

        return returnArr.join('\n');
      }

      split = split.join(' ').split(/(?: ?\: ?| ?,? )/g); // split at " : " OR "," OR " "
      varType = ConvertType(split.pop()); // convert Pseudocode type to JS type
      const vars = split.splice(1); // ignore first element: "DECLARE"
      vars.forEach(v => checks.addVar(v, null, varType));
      return `let ${vars.join(', ')}`;
    }
    case "CONSTANT": {
      let statement = split.join(' ').replace(/CONSTANT/, 'const').replace(/===/g, '=');
      let val = eval(statement + `; ${split[1]}`);
      checks.addVar(split[1], val, TypeOf(val), true); // saves the constant, to record its changes
      return `const ${split[1]} = ${TypeOf(val) === 'string' ? `"${val}"` : val}`;
    }
    case "PROCEDURE": {
      let match = split.join(' ').match(/\((.+)\)/);
      if (!match) return `function ${split[1]}() {`

      let parSplit = match[1].split(' , ');
    
      parameters = [];
      parSplit.forEach(param => {
        let varSplit = param.split(' ');
        let varName = (['BYREF', 'BYVAL'].includes(varSplit[0]) ? varSplit[1] : varSplit[0]); // if there's a BYREF or BYVAL, ignore it
        varType = ConvertTypeOf(varSplit.pop());
        checks.addVar(varName, null, varType);
        parameters.push(varName);
      });

      return `function ${split[1]}(${parameters}) {` // make function header with all paramters
    }
    case "CALL": {
      return `${split.slice(1,split.length).join('')}`;
    }
    case "FUNCTION": {
      let match = split.join(' ').match(/\((.+)\)/);
      if (!match) return `function ${split[1]}() {`

      let parSplit = match[1].split(' , ');

      let returnType = split.pop();

      checks.identifiers[split[1]] = {prop: "function", name: split[1], type: ConvertType(returnType)};
    
      parameters = [];
      parSplit.forEach(param => {
        let varSplit = param.split(' ');
        varType = ConvertType(varSplit.pop());
        checks.addVar(varSplit[0], null, varType);
        parameters.push(varSplit[0]);
      });
      return `function ${split[1]}(${parameters}) {` // make function header with all paramters
    }
    case "IF": {
      let last = split.pop();
      split.push((last == "{" ? ") {" : ")"));
      return `if(${split.slice(1, split.length).join(' ')}`;
    }
    case "FOR": {
      let [func, i, min, max] = split.join(' ').split(/(?: ?<- ?| ?TO ?|FOR )+/g);
      return `for (${i} = ${min}; ${i} <= ${max}; ${i}++) {`;
    }
    case "WHILE": {
      return `while(${split.slice(1, split.length).join(' ')}) {`;
    }
    case "INPUT": {
      if (!checks.identifiers[split[1]]) error(`'Cannot perform input on undeclared '${split[1]}'`);
      if (checks.identifiers[split[1]].constant) error(`Cannot perform input on constant '${split[1]}'`);
      const modifier = (['float','int'].includes(checks.identifiers[split[1]].type) ? "*1" : "");
      return `${split.splice(1).join(' ')} = require('prompt-sync')()()${modifier};`
    }
    case "OUTPUT": {
      return `console.log(${split.slice(1,split.length).join(' ')})`;
    }
    case "OPENFILE": {
      checks.addFile(identifier, split.pop());

      if (checks.identifiers[identifier].state === "READ")
        return `_[${identifier}] = require("fs").readFileSync(${identifier}, {encoding: "utf-8"}).split("\\n")`; // no JS code for opening files
      else if (checks.identifiers[identifier].state === "WRITE")
        return `require("fs").writeFileSync(${identifier}, "", {encoding: "utf-8"})`;
      else (checks.identifiers[identifier].state === "APPEND")
        return "";
    }
    case "CLOSEFILE": {
      checks.closeFile(identifier);
      return `_[${identifier}] = null`; // no JS code for closing files
    }
    case "READFILE": {
      if (!checks.identifiers[identifier] || checks.identifiers[identifier].state != "READ")
        error("Cannot read file that is not open for reading");
      return `${split[3]} = _[${identifier}].splice(0, 1)[0]`; // "read one line"
    }
    case "WRITEFILE": {
      if (!checks.identifiers[identifier] || checks.identifiers[identifier].state != "WRITE")
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

const headerLines = [
  "/* Built-in pseudocode functions */",
  "const MID = (str, start, end) => str.slice(start-1, end+1);",
  "const LEFT = (str, end) => str.slice(0, end+1);",
  "const RIGHT = (str, end) => str.slice(str.length-2, end+1);",
  "const LENGTH = (element) => Object.keys(element).length;",
  "\n/* Compiler variables */",
  "let _ = {};",
  "_.Array = (min, max, arrName) => {",
  "return new Proxy(Array(max - min + 1).fill(null), {",
  "get: (target, name) => { if (name < min || name > max) throw (`${arrName} out of bounds`); return target[name - min] },",
  "set: (target, name, value) => { if (name < min || name > max) throw (`${arrName} out of bounds`); target[name - min] = value }",
  "});\n}\n",
  "/* Translated begins here code */"
];

fs.writeFileSync('compiled.js', headerLines.join('\n')); // create new compiled.js file

pcLines.forEach(pcLine => {

  lineCounter++;

  /* Formating */
  pcLine = pcLine.replace(/\/\/.*/g, ''); // remove all comments
  pcLine = pcLine.replace(/(?:  )+/g, ''); // remove double spaces (indentation)
  pcLine = pcLine.replace(/(?<=\w)\(/g, " ("); // add space margin for front parentheses: "a(b)" -> "a (b)"
  pcLine = pcLine.replace(/(?<=\w)\)/g, ") "); // add space margin for back parentheses: "(a)b" -> "(a) b"
  pcLine = pcLine.replace(/(?<=\w)\[/g, " ["); // add space margin for front brackets: "a[b]" -> "a [b]"
  pcLine = pcLine.replace(/(?<=\w)\]/g, "] "); // add space margin for back brackets: "[a]b" -> "[a] b"
  pcLine = pcLine.replace(/[ +]?,[ +]?/g, " , "); // add spaces around commas: 'a,b' -> 'a , b'

  /*** REPLACES ***/
  // Operators
  pcLine = pcLine.replace(/MOD/g, '%');
  pcLine = pcLine.replace(/(?<!<|>)=/g, '===');
  pcLine = pcLine.replace(/&/g, "+");
  pcLine = pcLine.replace(/NOT/g, "!");
  pcLine = pcLine.replace(/AND/g, "&&");
  pcLine = pcLine.replace(/^[^a-zA-Z]*OR/g, "||");
  pcLine = pcLine.replace(/TRUE/g, "true");
  pcLine = pcLine.replace(/FALSE/g, "false");

  // Functions
  pcLine = pcLine.replace(/ENDPROCEDURE/, '}');
  pcLine = pcLine.replace(/ENDFUNCTION/, '}');
  pcLine = pcLine.replace(/RETURN/, 'return');

  // Loops
  pcLine = pcLine.replace(/NEXT .+/g, '}');
  pcLine = pcLine.replace(/ENDWHILE/g, '}');

  // IFs
  pcLine = pcLine.replace(/ENDIF/g, '}');
  pcLine = pcLine.replace(/THEN/g, '{');
  pcLine = pcLine.replace(/ELSE/g, '} else {');``

  let jsLine = ConvertLine(pcLine.split(/ +/g));

  // EOFs (need to be replaced after line conversion)
  if (jsLine.match(/EOF \([^\)]+\)/g)) {
    jsLine.match(/EOF \([^\)]+\)/g).forEach(e => {
      let identifier = GetFileName(e); // either filename, or variable

      if (!checks.identifiers[identifier]) {
        error("Cannot read EOF of unopened file");
      }

      if (checks.identifiers[identifier].state != "READ")
        error("Cannot read EOF of file not open for reading.");
      // EOF(identifier) -> check length of file array
      jsLine = jsLine.replace(e, `(_[${identifier}].length === 0)`);
    });
  }

  // Assignment checks (constant assignment, data type checks, declaration checks). These conflict with FOR
  if (jsLine.includes('<-')) {
    let [element, value] = jsLine.split(/ ?<- ?/g);

    if (!checks.identifiers[element])
      error(`Cannot assign value to undeclared variable '${element}'`);
    else if (checks.identifiers[element].constant)
      error(`Cannot assign value to constant variable '${element}'`);

    // if (!value.includes(element) && checks.identifiers[element].type !== TypeOf(value) || checks.identifiers[element.type] == "float" && !['float', 'int'].includes(TypeOf(value))) // first, make sure the "value" doesn't contain the var's name
    //   error(`Cannot assign value to '${element}' of a different data type`);
  
    checks.identifiers[element].value = value;
    jsLine = jsLine.replace(/<-/, '=');
  }

  fs.appendFileSync('compiled.js', `\n${jsLine}`)
});

/* Check if all files were closed at the end of the script */
Object.keys(checks.identifiers).forEach(i => {
  if (checks.identifiers[i].prop == "file" && checks.identifiers[i].state != "closed")
    error("Cannot execute script with unclosed files.");
})

