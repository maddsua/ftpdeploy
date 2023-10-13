
export const getArg = (arg: string) => {

	const argv = Deno.args.filter(item => item.startsWith('--')).map(item => item.split('=') as [string, string]).map(([key, value]) => ([key.toLowerCase().slice(2), value]));

	const argTemplate = arg.toLowerCase();
	return argv.find(item => item[0] === argTemplate)?.[1] || null;
};
