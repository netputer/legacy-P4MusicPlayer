// 闭包，避免影响外层代码
void function (window) {
    // 用 console 包装执行，利用 Uglify 在 build 过程中将其自动移除
    console.log((function () {
        var weinreScript = document.createElement('script');
        weinreScript.type = 'text/javascript';
        weinreScript.src = 'http://192.168.109.19:8080/target/target-script-min.js#p4music';

        var scriptTag = document.getElementsByTagName('script')[0];
        scriptTag.parentNode.insertBefore(weinreScript, scriptTag);
    })());

    // 供 Native 调用的接口
    window.wandoujia = window.wandoujia || {};
    window.wandoujia.audio = window.wandoujia.audio || {};
    var wdjAudio = window.wandoujia.audio;

    // 向 Native 发送数据的接口
    // 这是 Native 创建的方法，必须直接调用，不能赋值给一个变量
    window.NativeCallback = window.NativeCallback || {};
    window.NativeCallback.sendToNative = window.NativeCallback.sendToNative || function () {};
    var wdjNative = {};

    // 全局的 audio dom 对象
    var audioDom;
    // 尝试 audioDom 是否创建成功
    var MAX_TIME = 5000;
    // onready 的计时器
    var timer = 0;
    // 是否通过 native 控制已经播放一次
    var firstPlay = false;
    // 标记是否是用户触发
    var isUserFlag = true;
    // 存储 duration
    var duration = 0;
    var isNativeReadySent = false;
    var gettingDuration = true;

    var HOST_LIST = {
        'kugou.com': 'kugou',
        'duomi.com': 'duomi',
        '163.com': '163',
        'xiami.com': 'xiami',
        'qq.com': 'qq',
        'baidu.com': 'baidu',
        'dongting.com': 'dongting'
    };

    // 获取来源信息
    function getSource() {
        for (var host in HOST_LIST) {
            if (location.host.indexOf(host) !== -1) {
                return HOST_LIST[host];
            }
        }

        return false;
    }

    function extend(source, extendObj) {
        source = source || {};

        for (var k in extendObj) {
            if (extendObj.hasOwnProperty(k)) {
                source[k] = extendObj[k];
            }
        }

        return source;
    }

    // 播放相关方法，暴露给 Native
    extend(wdjAudio, {
        hasAudio: function () {
            console.log('wdjAudio.hasAudio', arguments);

            return !!audioDom;
        },
        play: function () {
            console.log('wdjAudio.play', arguments);

            if (!firstPlay) {
                firstPlay = true;
            }
            isUserFlag = false;
            audioDom.play();
        },
        pause: function () {
            console.log('wdjAudio.pause', arguments);

            isUserFlag = false;
            audioDom.pause();
        },
        stop: function () {
            console.log('wdjAudio.stop', arguments);

            audioDom.pause();
            audioDom.currentTime = 1;
        },
        progress: function (time) {
            // console.log('wdjAudio.progress', arguments);

            if (arguments.length) {
                audioDom.currentTime = Number(time);
            } else {
                wdjNative.sendProgress(audioDom.currentTime);
            }
        },
        duration: function () {
            // console.log('wdjAudio.duration', arguments);

            gettingDuration = true;
            var length = 50;
            if (audioDom.currentTime) {
                var old = audioDom.currentTime + length;
                audioDom.currentTime += length;
                if (audioDom.duration > 10 && old > audioDom.currentTime) {
                    duration = Math.max(audioDom.currentTime, audioDom.duration);
                    wdjNative.sendDuration(duration);
                    audioDom.currentTime = 1;
                    gettingDuration = false;
                } else {
                    wdjAudio.duration();
                }
            } else {
                setTimeout(function () {
                    wdjAudio.duration();
                }, 100);
            }
        }
    });


    // 封装 Native 接口，便于调用和调试
    extend(wdjNative, {
        sendReady: function () {
            console.log('wdjNative.sendReady', arguments);

            window.NativeCallback.sendToNative('onready', JSON.stringify({
                source: getSource()
            }));
        },
        sendDuration: function (duration) {
            console.log('wdjNative.sendDuration', arguments);

            window.NativeCallback.sendToNative('duration', JSON.stringify({
                duration: duration
            }));
        },
        sendProgress: function (progress) {
            // console.log('wdjNative.sendProgress', arguments);

            window.NativeCallback.sendToNative('progress', JSON.stringify({
                progress: progress
            }));
        },
        sendPlay: function () {
            console.log('wdjNative.sendPlay', arguments);

            window.NativeCallback.sendToNative('onplay', JSON.stringify({
                isUser: isUserFlag
            }));
        },
        sendPause: function () {
            console.log('wdjNative.sendPause', arguments);

            window.NativeCallback.sendToNative('onpause', JSON.stringify({
                isUser: isUserFlag
            }));
        },
        sendEnded: function () {
            console.log('wdjNative.sendEnded', arguments);

            window.NativeCallback.sendToNative('onended', '');
        },
        sendError: function (data) {
            console.log('wdjNative.sendError', arguments);

            window.NativeCallback.sendToNative('onerror', JSON.stringify(data));
        }
    });

    // 需要的回调
    function bindEvent() {
        audioDom.addEventListener('loadedmetadata', function () {
            console.log('audioDom.onLoadedmetadata', arguments);

            wdjAudio.duration();
        });

        audioDom.addEventListener('play', function () {
            console.log('audioDom.onPlay', arguments);

            wdjNative.sendPlay();
            isUserFlag = true;
        });

        audioDom.addEventListener('ended', function () {
            console.log('audioDom.onEnded', arguments);

            if (firstPlay && !gettingDuration && duration !== 1) {
                wdjNative.sendEnded();
            }
        });

        audioDom.addEventListener('pause', function () {
            console.log('audioDom.onPause', arguments);

            if (firstPlay) {
                wdjNative.sendPause();
                isUserFlag = true;
            }
        });

        audioDom.addEventListener('error', function (data) {
            console.log('audioDom.onError', arguments);

            wdjNative.sendError(data);
        });

        audioDom.addEventListener('durationchange', function () {
            console.log('audioDom.onDurationchange', arguments);

            if (audioDom.duration > 1 && !isNativeReadySent) {
                isNativeReadySent = true;

                if (!audioDom.paused) {
                    audioDom.pause();
                }

                // 此时 onPause 可能未被触发，而 sendReady 后 Native 会调用 wdjAudio.play ，导致出现刚暂停又播放、刚播放又暂停的死循环
                setTimeout(function () {
                    wdjNative.sendReady();
                }, 200);
            }
        });
    }

    function getAudioDom() {
        audioDom = document.documentElement.getElementsByTagName('audio')[0];

        if (!audioDom) {
            if (timer < MAX_TIME) {
                setTimeout(function () {
                    getAudioDom();
                    timer += 50;
                }, 50);
            } else {
                wdjNative.sendError({
                    error: 'timeout'
                });
            }
        } else {
            bindEvent();
            simulatedClick();
        }
    }

    // 模拟用户点击
    function simulatedClick() {
        if (getSource() === '163' && !audioDom.src) {
            var mayBeEle = document.querySelector('#detailBox a');
            var customEvent = document.createEvent('MouseEvents');
            customEvent.initEvent('click', false, false);
            mayBeEle.dispatchEvent(customEvent);
            setTimeout(simulatedClick, 50);
        }
    }

    // 改写 QQ 音乐下载按钮的逻辑，使其点击时不暂停音乐播放
    var hackQQDownload = function () {
        var el = document.getElementById('lrc_js'),
        elClone = el.cloneNode(true);
        el.parentNode.replaceChild(elClone, el);

        document.getElementById('lrc_js').addEventListener('click', function () {
            window.downQQMusic();
        });
    };

    if (getSource() === 'qq') {
        hackQQDownload();
    }

    getAudioDom();
}(window);
