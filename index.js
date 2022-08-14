const fs = require('fs');

const GetFileName = (str) => {
  let match = str.match(/"(.+)"/); // try to match string filename. E.g.: "filename.txt"
  if (match)
    return `'${match[1]}'`; // return 'filename.txt'

  return str.split(' ')[1].match(/[^\(\)]/g).join(''); // if there isn't a string, return it as a variable. E.g.: filename
}

let pseudocodeScript = fs.readFileSync('script.pc', {encoding: 'utf-8'});
let pcLines = pseudocodeScript.split('\n');

let processedLines = ["let _ = {}; // this is a compiler variable"];

let checks = {files: {}, vars: {}}; // this will help with error detection

pcLines.forEach(pcLine => {
  /* Formating */
  pcLine = pcLine.replace(/\/\/.*/g, ''); // remove all comments
  pcLine = pcLine.replace(/  /g, ''); // remove double spaces (indentation)
  pcLine = pcLine.replace(/(?<=\w)\(/, " ("); // add space margin for front parentheses
  pcLine = pcLine.replace(/(?<=\w)\)/, " )"); // add space margin for back parentheses
  pcLine = pcLine.replace(/[ +]?,[ +]?/, " , "); // add spaces around commas ('a,b' -> 'a , b')

  /*** REPLACES ***/
  // Operators
  pcLine = pcLine.replace(/MOD/g, '%');
  pcLine = pcLine.replace(/=/g, '===');
  pcLine = pcLine.replace(/<-/g, "=");
  pcLine = pcLine.replace(/&/g, "+");
  pcLine = pcLine.replace(/NOT/g, "!");

  // Functions
  pcLine = pcLine.replace(/ENDPROCEDURE/, '}');
  pcLine = pcLine.replace(/ENDFUNCTION/, '}');

  // Loops
  pcLine = pcLine.replace(/NEXT .+/g, '}');
  pcLine = pcLine.replace(/ENDWHILE/g, '}');

  // IFs
  pcLine = pcLine.replace(/ENDIF/g, '}');
  pcLine = pcLine.replace(/THEN/g, '{');

  // Constants
  pcLine = pcLine.replace(/CONSTANT/g, "const");

  const split = pcLine.split(' ');
  let jsLine = ConvertLine(split);

  // EOFs (need to be replaced after line conversion)
  if (jsLine.match(/EOF \([^\)]+\)/g)) {
    jsLine.match(/EOF \([^\)]+\)/g).forEach(e => {
      let filename = GetFileName(e); // either filename, or variable

      if (!checks.files[filename]) {
        throw("Cannot read EOF of unopened file");
      }

      if (checks.files[filename].state != "READ")
        throw("Cannot read EOF of file not open for reading.");
      // EOF(filename) -> check length of file array
      jsLine = jsLine.replace(e, `(_[${filename}].length === 0)`);
    });
  }

  processedLines.push(jsLine);
});

Object.keys(checks.files).forEach(i => {
  if (checks.files[i].state != "closed")
    throw("Cannot execute script with unclosed files.");
})

fs.writeFileSync('compiled.js', processedLines.join('\n'));

function ConvertType(type) {
  switch (type) {
    case "INTEGER": return "number";
    case "REAL": return "number"; // no way to differentiate
    case "STRING": return "string";
    case "BOOLEAN": return "boolean";
    default: throw(`Type error: Unknown type '${type.toUpperCase()}'`);
  }
}

function ConvertLine(split) {
  switch (split[0]) {
    case "DECLARE": { 
      return `let ${split[1]}`;
    }
    case "PROCEDURE": {
      let parentheses = split.join(' ').match(/\(([^\)]+)\)/);
      if (!parentheses) parentheses = "()";
      else {
        let parSplit = parentheses[1].split(',');
      
        parentheses = '(';
        parSplit.forEach(parameter => {
          let varSplit = parameter.split(' ');
          parentheses += `${varSplit[1]},`;
        });

        parentheses = parentheses.slice(0, -1) + ')';
      }
      return `function ${split[1]}${parentheses} {`
    }
    case "CALL": {
      return `${split.slice(1,split.length).join('')}`;
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
      let filename = GetFileName(split.join(' ')); // e.g.: 'OPENFILE "filename.txt" FOR READ' -> 'filename.txt'
      if (checks.files[split[1]] && checks.files[split[1]].state != "closed") {
        throw('Cannot open an already open file');
      }
      checks.files[filename] = {state: split.pop()}; // split.pop() is the last element (i.e., "READ" or "WRITE")      
      return `_[${filename}] = require("fs").readFileSync(${filename}, {encoding: "utf-8"}).split("\\n")`; // no TS code for opening files
    }
    case "CLOSEFILE": {
      let filename = GetFileName(split.join(' '));
      if (!checks.files[filename] || checks.files[filename].state == "closed")
        throw("Cannot close a file that isn't open.");
        
      checks.files[filename].state = "closed";
      return `_[${filename}] = null`; // no TS code for closing files
    }
    case "READFILE": {
      let filename = GetFileName(split.join(' '));
      if (checks.files[filename].state != "READ")
        throw("Cannot read file that is not open for reading");

      // "read one line"
      return `${split[3]} = _[${filename}].splice(0, 1)[0]`;
    }
    default:
      return split.join(' ');
  }
}