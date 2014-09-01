module.exports = function (grunt) {
    // log task running time
    require('time-grunt')(grunt);

    // load all grunt tasks
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    // configurable paths
    var pathConfig = {
        app: 'app',
        dist: 'dist',
        tmp: '.tmp',
        test: 'test'
    };

    grunt.initConfig({
        paths: pathConfig,
        watch: {
            build: {
                files: [
                    '<%= paths.app %>/javascripts/**/*.js',
                    '<%= paths.app %>/templates/**/*.cf'
                ],
                tasks: [
                    'buildWithConsole',
                    'shell:adbPush'
                ],
                options: {
                    spawn: true
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            test: ['<%= paths.app %>/javascripts/**/*.js']
        },
        clean: {
            dist: ['<%= paths.dist %>']
        },
        uglify: {
            debug: {
                files: {
                    '<%= paths.dist %>/player.min.js': ['<%= paths.app %>/javascripts/player.js']
                }
            },
            build: {
                files: {
                    '<%= paths.dist %>/player.min.js': ['<%= paths.app %>/javascripts/player.js']
                },
                options: {
                    compress: {
                        'drop_console': true,
                        'pure_funcs': ['alert']
                    }
                }
            }
        },
        copy: {
            template: {
                files: [{
                    expand: true,
                    cwd: '<%= paths.app %>/templates',
                    dest: '<%= paths.dist %>',
                    src: ['walkman_web.cf']
                }],
                options: {
                    process: function (content, srcpath) {
                        return content.replace('{{JS}}', grunt.file.read(pathConfig.dist + '/player.min.js'));
                    }
                }
            },
            monitor: {
                files: [{
                    expand: true,
                    dest: '<%= paths.dist %>',
                    src: [
                        'monitor/**/*',
                        'node_modules/**/*',
                        'OathKeeper/**/*',
                        'package.json'
                    ]
                }]
            }
        },
        shell: {
            adbPush: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: 'adb push <%= paths.dist %>/walkman_web.cf /sdcard/wandoujia/walkman/'
            },
            adbForceStop: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: 'adb shell am force-stop com.wandoujia.phoenix2'
            },
            adbStart: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: 'adb shell am start -d "wdj://explore/music/album"'
            },
            adbRestart: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: [
                    'adb shell am force-stop com.wandoujia.phoenix2',
                    'adb shell am start -d "wdj://explore/music/album"'
                ].join(' && ')
            }
        },
        bump: {
            options: {
                files: ['package.json', 'bower.json'],
                updateConfigs: [],
                commit: true,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['-a'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: false
            }
        }
    });

    grunt.registerTask('build', [
        'jshint:test',
        'clean:dist',
        'uglify:build',
        'copy:template'
    ]);

    grunt.registerTask('buildWithConsole', [
        'jshint:test',
        'clean:dist',
        'uglify:debug',
        'copy:template'
    ]);

    grunt.registerTask('serve', [
        'buildWithConsole',
        'watch'
    ]);

    grunt.registerTask(['update'], [
        'bump-only:patch',
        'changelog',
        'bump-commit'
    ]);

    grunt.registerTask(['update:minor'], [
        'bump-only:minor',
        'changelog',
        'bump-commit'
    ]);

    grunt.registerTask(['update:major'], [
        'bump-only:major',
        'changelog',
        'bump-commit'
    ]);

    grunt.registerTask('build:staging', [
        'clean:dist',
        'copy:monitor'
    ]);

    grunt.registerTask('build:production', [
        'build:staging'
    ]);
};
