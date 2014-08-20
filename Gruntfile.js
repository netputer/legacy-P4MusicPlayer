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
            // test: {
            //     files: ['<%= paths.app %>/javascripts/**/*.js'],
            //     tasks: ['jshint:test'],
            //     options: {
            //         spawn: false
            //     }
            // },
            javascripts: {
                files: ['<%= paths.app %>/javascripts/**/*.js'],
                tasks: ['build'],
                options: {
                    spawn: false
                }
            },
            config: {
                files: ['<%= paths.dist %>/walkman_web.cf'],
                tasks: ['shell:adbPush'],
                options: {
                    spawn: false
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
            dist: {
                files: {
                    '<%= paths.dist %>/player.min.js': [
                        '<%= paths.app %>/javascripts/player.js'
                    ]
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
            }
        },
        shell: {
            adbPush: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: 'adb push <%= paths.dist %>/walkman_web.cf /sdcard/wandoujia/walkman/'
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
        'clean:dist',
        // 'jshint:test',
        'uglify:dist',
        'copy:template'
    ]);

    grunt.registerTask('serve', [
        'build',
        'shell:adbPush',
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
};
