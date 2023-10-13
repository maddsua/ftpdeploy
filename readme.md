# A deploy tool for uploading static files via ftp from CICD environment

Import this thing as a git submodule, modify deno.json and create a workflow. Sounds simple to me and nobody will use it anyway so that's enough for the readme.

## Variables

Variables can be set using env var, which is the preferred way to do in CICD, or using cli arguments.

List of vars in format:

\[ENV\] - \[CMD\] - \[default value\] - \[description\]

- `FTP_DEPLOY_DIST` - `distDir` - `./dist` - Path in cicd container from where files should be taken, like Vite dist directory

- `FTP_DEPLOY_FOLDER` - `deploysFolder` - `/ftpdeploy/deploys` - Path on the ftp server where to store temp files

- `FTP_DEPLOY_WWW_PROD` - `wwwProd` - `/web/www` - Path on the ftp server where to put the stuff so it will go public. The document root if you will

- `FTP_DEPLOY_HOST` - `host` - `undefined` - FTP host address (*empty by default and must be provided)

- `FTP_DEPLOY_USER` - `user` - `undefined` - FTP user name (*empty by default and must be provided)

- `FTP_DEPLOY_PASSWORD` - `password` - `undefined` - FTP user password (*empty by default and must be provided)
