// 闭包，避免影响外层代码
void function(window){
    // 声明 webview 方法作用域
    window.wandoujia = window.wandoujia || {};
    window.wandoujia.audio = window.wandoujia.audio || {};
    // 向 Native 发送数据的接口 Object
    var NativeCallback = window.NativeCallback || {};
    // 该处 native 创建的方法必须直接调用，不能赋值给一个变量
    NativeCallback.sendToNative = NativeCallback.sendToNative || function() {};
    // 全局的 audio dom 对象
    var audioDom;
    // 尝试 audioDom 是否创建成功
    var MAX_TIME = 5000;
    // onready 的计时器
    var timer = 0;
    // 是否通过 native 控制已经播放一次
    var firstPlay = false;
    // 标记是否是用户触发
    var isUserFlag = false;

    function extend(source, extendObj) {
        if (!source) {
            source = {};
        }
        for (var k in extendObj) {
            source[k] = extendObj[k];
        }
    }

    // 播放相关方法，暴露给 native
    extend(window.wandoujia.audio, {
        audioDom: audioDom,
        hasAudio: function() {
            return !!audioDom;
        },
        play: function() {
            if (!firstPlay) {
                firstPlay = true;
            }
            isUserFlag = false;
            audioDom.play();
        },
        pause: function() {
            isUserFlag = false;
            audioDom.pause();
        },
        stop: function() {
            audioDom.pause();
            audioDom.currentTime = 1;
        },
        progress: function(time) {
            if (arguments.length) {
                audioDom.currentTime = Number(time);
            } else {
                NativeCallback.sendToNative('progress', JSON.stringify({
                    progress: audioDom.currentTime
                }));
            }
        }
    });

    function bindEvent() {

        // 需要的回调
        audioDom.addEventListener('loadedmetadata', function() {
        });

        audioDom.addEventListener('play', function() {
            NativeCallback.sendToNative('onplay', JSON.stringify({
                isUser: isUserFlag
            }));
            isUserFlag = true;
        });

        audioDom.addEventListener('ended', function() {
            if (firstPlay) {
                NativeCallback.sendToNative('onended', '');
            }
        });

        audioDom.addEventListener('pause', function() {
            if (firstPlay) {
                NativeCallback.sendToNative('onpause', JSON.stringify({
                    isUser: isUserFlag
                }));
                isUserFlag = true;
            }
        });

        audioDom.addEventListener('error', function(data) {
            NativeCallback.sendToNative('onerror', JSON.stringify(data));
        });

        audioDom.addEventListener('durationchange', function() {
            NativeCallback.sendToNative('duration', JSON.stringify({
                duration: audioDom.duration
            }));
        });
    }

    function getAudioDom() {
        audioDom = document.documentElement.getElementsByTagName('audio')[0];

        if (audioDom) {
            window.wandoujia.audio.audioDom = audioDom;
            readyToPlay();
        } else {
            if (timer < MAX_TIME) {
                setTimeout(function() {
                    getAudioDom();
                    timer += 50;
                }, 50);
            } else {
                NativeCallback.sendToNative('onerror', JSON.stringify({
                    error: 'timeout'
                }));
            }
        }
    }

    // 模拟用户点击 and ready to play, send status 'ready' to native
    function readyToPlay() {
        var triggerPlay = function() {
            var blackList = ['163.com'];
            for (var i = 0, l = blackList.length; i < l; i ++) {
                if (location.host.indexOf(blackList[i]) !== -1 && !audioDom.src) {
                    var mayBeEle = document.querySelector('a');
                    var customEvent = document.createEvent('MouseEvents');
                    customEvent.initEvent('click', false, false);
                    mayBeEle.dispatchEvent(customEvent);
                }
            }
        };

        triggerPlay();

        var MAX_TIMES = 10;
        var times = 1;
        var triggerOnReady = function() {
            if (!audioDom.src || audioDom.src.length === 0) {
                triggerPlay();
                setTimeout(function() {
                    times += 1;
                    if (times >= MAX_TIMES) {
                    } else {
                        triggerOnReady();
                    }
                }, 50);

            } else {

                if (audioDom.src && !firstPlay ) { //&& !audioDom.paused
                    audioDom.pause();
                }
                bindEvent();
                if (audioDom.paused && !isUserFlag) {
                    NativeCallback.sendToNative('onready', JSON.stringify({
                        source: getSource()
                    }));
                }
            }
        }
        setTimeout(function() {
            triggerOnReady();
        }, 50);
    }

    // 获取来源信息
    function getSource() {
        var obj = {
            'kugou.com': 'kugou',
            'duomi.com': 'duomi',
            '163.com': '163',
            'xiami.com': 'xiami',
            'qq.com': 'qq',
            'baidu.com': 'baidu',
            'dongting.com': 'dongting'
        };
        for (var k in obj) {
            if (location.host.indexOf(k) !== -1) {
                return obj[k];
            }
        }
    }

    var hackQQDownload = function() {
        var QQList = ['qq.com'];
        for (var i = 0, l = QQList.length; i < l; i ++) {
            if (location.host.indexOf(QQList[i]) !== -1) {
                var el = document.getElementById('lrc_js'),
                elClone = el.cloneNode(true);
                el.parentNode.replaceChild(elClone, el);

                document.getElementById('lrc_js').addEventListener('click', function() {
                    downQQMusic();
                });
            }
        }
    }

    hackQQDownload();
    getAudioDom();

}(window);
