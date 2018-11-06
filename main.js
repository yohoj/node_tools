const imgMerge = require('./imgMerge');

function main(argvs) {
    let source = argvs[0];
    let output = argvs[1];
		let engine = argvs[2];
    if(!engine){
	    source = process.cwd() + '/design/images/';
    	output = process.cwd() + '/assets/resources/textures/';
    }
    else{
	    source = process.cwd() + '/design/images/';
	    output = process.cwd() + '/resource/assets/';
    }
    let type = engine == 'egret' ? 1 : 0;
    console.log(engine,type);
    let img = new imgMerge(source, output,type);

}
main(process.argv.slice(2));