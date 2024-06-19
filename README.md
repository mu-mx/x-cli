# x-cli
x-cli  创建项目脚手架



 git clone


 pnpm i

 npm link 作为全局的工具使用


##  yalc
使用 yalc 可以实现类似 npm link 的功能

 npm install -g yalc


 yalc publish

package.json 文件要有  "version": "0.0.1",


链接到全局
 yalc link your-tool-name


安装并注册命令：
一旦包被链接到全局 yalc 仓库，你可以在项目中使用以下命令安装并注册命令：

 yalc add your-tool-name

这个包  会让你的工具是局部注册,执行完命令后你会在该项目的 node_modules 里面看到 bin 里面注册的命令
不满足当前这个的需求,我要的是全局的脚手架工具
但是可以作为组件库等需求开发调试的工具

常见的全局包
 npm  i   nodemon  nrm  serve  yalc  express-generator  -g