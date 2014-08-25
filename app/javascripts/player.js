// 闭包，避免影响外层代码
void function (window) {
    // var weinreScript = document.createElement('script');
    // weinreScript.type = 'text/javascript';
    // // weinreScript.async = true;
    // weinreScript.src = 'http://192.168.109.19:8080/target/target-script-min.js#p4music';

    // var scriptTag = document.getElementsByTagName('script')[0];
    // scriptTag.parentNode.insertBefore(weinreScript, scriptTag);

    // 供 Native 调用的接口
    window.wandoujia = window.wandoujia || {};
    window.wandoujia.audio = window.wandoujia.audio || {};
    var wdjAudio = window.wandoujia.audio;

    // 向 Native 发送数据的接口
    // 这是 Native 创建的方法，必须直接调用，不能赋值给一个变量
    var NativeCallback = window.NativeCallback || {};
    NativeCallback.sendToNative = NativeCallback.sendToNative || function () {};

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
    var noSentReady = true;
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

    // 播放相关方法，暴露给 native
    extend(wdjAudio, {
        audioDom: audioDom,
        hasAudio: function () {
            console.log('wdjAudio.hasAudio called', arguments);

            return !!audioDom;
        },
        play: function () {
            console.log('wdjAudio.play called', arguments);

            if (!firstPlay) {
                firstPlay = true;
            }
            isUserFlag = false;
            audioDom.play();
        },
        pause: function () {
            console.log('wdjAudio.pause called', arguments);

            isUserFlag = false;
            audioDom.pause();
        },
        stop: function () {
            console.log('wdjAudio.stop called', arguments);

            audioDom.pause();
            audioDom.currentTime = 1;
        },
        progress: function (time) {
            console.log('wdjAudio.progress called', arguments);

            if (arguments.length) {
                audioDom.currentTime = Number(time);
            } else {
                NativeCallback.sendToNative('progress', JSON.stringify({
                    progress: audioDom.currentTime
                }));
            }
        },
        duration: function () {
            console.log('wdjAudio.duration called', arguments);

            gettingDuration = true;
            var length = 50;
            if (audioDom.currentTime) {
                var old = audioDom.currentTime + length;
                audioDom.currentTime += length;
                if (audioDom.duration > 10 && old > audioDom.currentTime) {
                    duration = Math.max(audioDom.currentTime, audioDom.duration);
                    NativeCallback.sendToNative('duration', JSON.stringify({
                        duration: duration
                    }));
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

    function bindEvent() {
        // 需要的回调
        audioDom.addEventListener('loadedmetadata', function () {
            wdjAudio.duration();
        });

        audioDom.addEventListener('play', function () {
            NativeCallback.sendToNative('onplay', JSON.stringify({
                isUser: isUserFlag
            }));
            isUserFlag = true;
        });

        audioDom.addEventListener('ended', function () {
            if (firstPlay && !gettingDuration && duration !== 1) {
                NativeCallback.sendToNative('onended', '');
            }
        });

        audioDom.addEventListener('pause', function () {
            if (firstPlay) {
                NativeCallback.sendToNative('onpause', JSON.stringify({
                    isUser: isUserFlag
                }));
                isUserFlag = true;
            }
        });

        audioDom.addEventListener('error', function (data) {
            NativeCallback.sendToNative('onerror', JSON.stringify(data));
        });

        audioDom.addEventListener('durationchange', function () {
            if (audioDom.duration !== 1 && noSentReady) {
                noSentReady = false;
                if (!audioDom.paused) {
                    audioDom.pause();
                }
                NativeCallback.sendToNative('onready', JSON.stringify({
                    source: getSource()
                }));
            }
        });
    }

    function getAudioDom() {
        audioDom = document.documentElement.getElementsByTagName('audio')[0];
        if (!audioDom && timer < MAX_TIME) {
            setTimeout(function () {
                getAudioDom();
                timer += 50;
            }, 50);
        }
        if (!audioDom && timer >= MAX_TIME) {
            NativeCallback.sendToNative('onerror', JSON.stringify({
                error: 'timeout'
            }));
        }
        if (audioDom) {
            bindEvent();
            simulatedClick();
        }
    }

    // 模拟用户点击
    function simulatedClick() {
        if (getSource() === '163' && !audioDom.src) {
            var mayBeEle = document.querySelector('a');
            var customEvent = document.createEvent('MouseEvents');
            customEvent.initEvent('click', false, false);
            mayBeEle.dispatchEvent(customEvent);
            setTimeout(simulatedClick, 50);
        }
    }

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
