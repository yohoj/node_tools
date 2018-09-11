const imgMerge = require('./imgMerge');

function main(argvs) {
    let source = argvs[0];
    let output = argvs[1];
    if(!source){
    	// console.log('')
	    source = process.cwd() + '/design/images/';
    	output = process.cwd() + '/assets/resources/textures/';


    }
    let img = new imgMerge(source, output);

}
main(process.argv.slice(2));