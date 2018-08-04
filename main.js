const imgMerge = require('./imgMerge');

function main(argvs) {
		console.log(argvs);
    let source = argvs[0];
    let output = argvs[1];
    if(!source){
	    source = process.cwd() + '/design/';
    	output = process.cwd() + '/assets/Texture/';
    }
    let img = new imgMerge(source, output);

}
main(process.argv.slice(2));