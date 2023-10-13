
export const getLastCommitHash = async () => {

	const handle = new Deno.Command('git', {
		args: 'rev-parse HEAD'.split(' ')
	});
	
	const result = await handle.output();

	const stdErrText = new TextDecoder().decode(result.stderr);
	if (!result.success) throw new Error(`Failed to call git: ${stdErrText}`);
	
	const stdOutText = new TextDecoder().decode(result.stdout);
	return stdOutText.replace(/[\s\r\n]+/g, '');
};
