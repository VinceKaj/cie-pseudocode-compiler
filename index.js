const fs = require('fs');

let pseudocodeScript = fs.readFileSync('script.pc', {encoding: 'utf-8'});
let pcLines = pseudocodeScript.split('\n');

let processedLines = [];

pcLines.forEach(pcLine => {
  pcLine = pcLine.replace(/  /g, ''); // remove double spaces (indentation)
  pcLine = pcLine.replace(/(?<=\w)\(/, " ("); // add space margin for parentheses

  /*** REPLACES ***/
  // Operators
  pcLine = pcLine.replace(/MOD/g, '%');
  pcLine = pcLine.replace(/=/g, '===');
  pcLine = pcLine.replace(/<-/g, "=");
  pcLine = pcLine.replace(/&/g, "+");

  // Functions
  pcLine = pcLine.replace(/ENDPROCEDURE/, '}');
  pcLine = pcLine.replace(/ENDFUNCTION/, '}');

  // Loops
  pcLine = pcLine.replace(/NEXT .*/g, '}');

  // IFs
  pcLine = pcLine.replace(/ENDIF/g, '}');

  // Constants
  pcLine = pcLine.replace(/CONSTANT/g, "const");

  const split = pcLine.split(' ');
  const jsLine = ConvertLine(split);

  processedLines.push(jsLine);
});

fs.writeFileSync('compiled.ts', processedLines.join('\n'));

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
      return `let ${split[1]}: ${ConvertType(split[3])}`;
    }
    case "PROCEDURE": {
      let parentheses = split.join(' ').match(/\(([^\)]+)\)/);
      if (!parentheses) parentheses = "()";
      else {
        let parSplit = parentheses[1].split(',');
      
        parentheses = '(';
        parSplit.forEach(parameter => {
          let varSplit = parameter.split(' ');
          parentheses += `${varSplit[1]}: ${ConvertType(varSplit[3])},`;
        });

        parentheses = parentheses.slice(0, -1) + ')';
      }
      return `function ${split[1]}${parentheses} {`
    }
    case "CALL": {
      return `${split.slice(1,split.length).join('')}`;
    }
    case "IF": {
      return `if(${split.slice(1, split.length-1).join(' ')}) {`;
    }
    case "FOR": {
      let toIndex = split.indexOf('TO');
      return `for(${split.slice(1,toIndex).join(' ')}; ${split[1]} <= ${split[5]}; ${split[1]}++) {`;
    }
    case "OUTPUT": {
      return `console.log(${split.slice(1,split.length).join(' ')})`;
    }
    default:
      return split.join(' ');
  }
}