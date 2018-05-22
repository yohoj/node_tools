const imgMerge = require('./imgMerge');

function main(argvs) {
    let source = argvs[0];
    let output = argvs[1];
    if(!source){
    	source = process.cwd() + '/../client/design/';
    	output = process.cwd() + '/../client/assets/textures/';
    }
    let img = new imgMerge(source, output);

}
main(process.argv.slice(2));