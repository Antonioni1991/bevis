// 载入需要的依赖和插件
var gulp = require('gulp'),
    browserSync = require('browser-sync').create(),
    runSequence = require('run-sequence'),
    reload = browserSync.reload,                    // 页面同步刷新
    htmlmin = require('gulp-htmlmin'),              // html 压缩
    less = require('gulp-less'),                    // less 编译成 css
    minifyCss = require('gulp-minify-css'),         // css 压缩
    uglify = require('gulp-uglify'),                // js 压缩
    imagemin = require('gulp-imagemin'),            // 图片压缩
    rename = require('gulp-rename'),                // 重命名
    del = require('del'),                           // 删除文件
    rev = require('gulp-rev'),                      // 对文件名加MD5后缀
    revCollector = require('gulp-rev-collector'),   // 路径替换
    nodemon = require('gulp-nodemon'),

    config = require('./config'),

    _srcname = './client',
    _dirname = './assets',
    _rev = './client/rev',

    cssSrc = _srcname + '/less/**/*',
    jsSrc = _srcname + '/js/**/*',
    imgSrc = _srcname + '/images/**/*',
    cssRevSrc = _srcname + '/less/revCss',
    htmlSrc = './views',

    cssDest = _dirname + '/client/less',
    jsDest = _dirname + '/client/js',
    imgDest = _dirname + '/client/images';

// 清除上次打包的文件
gulp.task('clean', function(){
    del([
        _dirname +'/*',                     // 不希望删掉这个文件,取反这个匹配模式: '!dist/mobile/deploy.json'
        _rev,
        cssRevSrc
    ]);
});

gulp.task('delRevCss', function(){
    del([
        cssRevSrc,
        _rev
    ]);
});

// 压缩,合并 CSS,生成版本号
gulp.task('miniCss', function() {
    return gulp.src(cssRevSrc+'/**/*')
        .pipe(less())                       // less 转 css
        .pipe(minifyCss())                  // 压缩 css 文件
        .pipe(rev())                        // 文件名加 MD5 后缀
        .pipe(gulp.dest(cssDest))           // 直接输出到目标路径
        .pipe(rev.manifest())               // 生成一个 rev-manifest.json
        .pipe(gulp.dest(_rev+'/less'));      // 将 rev-manifest.json 保存到 rev 目录内
});

// 压缩 JS,生成版本号
gulp.task('miniJs', function() {
    return gulp.src(jsSrc)
        .pipe(uglify())
        .pipe(rev())
        .pipe(gulp.dest(jsDest))
        .pipe(rev.manifest())
        .pipe(gulp.dest(_rev+'/js'));
});

// 压缩 Images, 生成版本号
gulp.task('miniImg', function() {
    return gulp.src(imgSrc)
        .pipe(imagemin({
            optimizationLevel: 3,   // png,1~7
            progressive: true,      // jpg
            interlaced: true        // gif
        }))
        .pipe(rev())
        .pipe(gulp.dest(imgDest))
        .pipe(rev.manifest())
        .pipe(gulp.dest(_rev+'/images'));
});

gulp.task('revCss', function() {
    return gulp.src([_rev+'/**/*.json', cssSrc])
        .pipe(revCollector())
        .pipe(gulp.dest(cssRevSrc));
});

// Html 引入文件版本
gulp.task('revHtml', function () {
    return gulp.src([_rev+'/**/*.json', htmlSrc+'/*'])
        .pipe(revCollector())
        .pipe(htmlmin({
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeComments: true
        }))
        .pipe(gulp.dest(_dirname+'/views'));
});

// build 之前的准备工作
gulp.task('prepare', function (done) {
    runSequence(
        ['miniImg'],
        ['revCss'],
        ['miniCss', 'miniJs'],
        ['revHtml'],
        ['delRevCss'],
    done);
});

// 项目都做好了准备 release 时 build
gulp.task('build', ['prepare']);

// dev 启动静态 Server 和文件变化监控
gulp.task('overlord', function() {
    // 启动 node express
    nodemon({
        script: 'app.js',
        env: {
            'NODE_ENV': 'development'
        }
    });
    browserSync.init({
        proxy: 'http://localhost:'+config.port,
        port: 9000,                   // 自定义端口
        notify: false                 // 不需要浏览器上提示状态信息
    });
    gulp.watch([htmlSrc+'/*/*', cssSrc, jsSrc, imgSrc]).on('change', reload);
});