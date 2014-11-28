// 闭包，避免影响外层代码
void function (window) {
    // 用 console 包装执行，利用 Uglify 在 build 过程中将其自动移除
    console.log((function () {
        var weinreScript = document.createElement('script');
        weinreScript.type = 'text/javascript';
        weinreScript.src = 'http://weinre.wandoulabs.com/target/target-script-min.js#p4music';

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

    // 合作方接口
    window.xiami = window.xiami || {};

    var audioDom; // 全局的 audio 对象
    var MAX_AUDIO_TIME = 25; // 尝试 audioDom 是否创建成功
    var AUDIO_TIMER = 0; // 寻找 audio 标签的计数器
    var isNativeControlledPlayOnce = false; // 是否通过 Native 控制已经播放一次
    var isNativeReadySent = false;

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

    var AUDIO_ERROR = [
        'reserved',
        'aborted',
        'network',
        'decode',
        'src_not_supported'
    ];

    // 根据错误码判断错误信息
    function getErrorMsg(code) {
        return AUDIO_ERROR[code] || 'unknown';
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
        dom: audioDom,
        hasAudio: function () {
            console.log('wdjAudio.hasAudio', arguments);

            return !!audioDom;
        },
        play: function () {
            console.log('wdjAudio.play', arguments);

            isNativeControlledPlayOnce = true;

            audioDom.play();
        },
        pause: function () {
            console.log('wdjAudio.pause', arguments);

            audioDom.pause();
        },
        stop: function () {
            console.log('wdjAudio.stop', arguments);

            audioDom.pause();
            audioDom.currentTime = 0;
        },
        progress: function (time) {
            // console.log('wdjAudio.progress', arguments);

            if (time !== undefined) {
                audioDom.currentTime = Number(time);
            } else {
                wdjNative.sendProgress(audioDom.currentTime);
            }
        },
        buffer: function () {
            wdjNative.sendBuffer();
        },
        xiamiSrc: function (newSrc) {
            var xiami = window.xiami.audio;

            if (!!newSrc) {
                xiami.src = newSrc;
            } else {
                window.NativeCallback.sendToNative('src', JSON.stringify(xiami.src));
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
        sendBuffer: function () {
            // console.log('wdjNative.sendBuffer', arguments);

            var buffered = audioDom.buffered;
            var bufferArray = [];
            var i;

            for (i = 0; i < buffered.length; i++) {
                bufferArray.push([buffered.start(i), buffered.end(i)]);
            }

            window.NativeCallback.sendToNative('buffer', JSON.stringify(bufferArray));
        },
        sendPlay: function () {
            console.log('wdjNative.sendPlay', arguments);

            window.NativeCallback.sendToNative('onplay', JSON.stringify({
                isUser: true // 历史遗留：没有必要标记此次操作是否由用户触发，下同
            }));
        },
        sendPause: function () {
            console.log('wdjNative.sendPause', arguments);

            window.NativeCallback.sendToNative('onpause', JSON.stringify({
                isUser: true
            }));
        },
        sendEnded: function () {
            console.log('wdjNative.sendEnded', arguments);

            window.NativeCallback.sendToNative('onended', '');
        },
        sendError: function (type, params) {
            console.log('wdjNative.sendError', arguments);

            window.NativeCallback.sendToNative('onerror', JSON.stringify({
                error: type,
                params: params
            }));
        }
    });

    // 需要的回调
    function bindEvent() {
        audioDom.addEventListener('play', function () {
            console.log('audioDom.onPlay', arguments);

            wdjNative.sendPlay();
        });

        audioDom.addEventListener('ended', function () {
            console.log('audioDom.onEnded', arguments);

            console.log('isNativeControlledPlayOnce', isNativeControlledPlayOnce);
            console.log('audioDom.duration', audioDom.duration);

            if (isNativeControlledPlayOnce && audioDom.duration !== 1) {
                wdjNative.sendEnded();
            }
        });

        audioDom.addEventListener('pause', function () {
            console.log('audioDom.onPause', arguments);

            wdjNative.sendPause();
        });

        audioDom.addEventListener('error', function (e) {
            console.log('audioDom.onError', arguments);

            wdjNative.sendError(getErrorMsg(e.currentTarget.error.code));
        });

        audioDom.addEventListener('durationchange', function () {
            console.log('audioDom.onDurationchange', arguments);
            console.log('audioDom.duration: ' + audioDom.duration);
            alert('audioDom.duration: ' + audioDom.duration);

            wdjNative.sendDuration(audioDom.duration);

            if (audioDom.duration > 1 && !isNativeReadySent) {
                isNativeReadySent = true;
                wdjNative.sendReady();
            }
        });
    }

    function getAudioDom() {
        switch (getSource()) {
        case 'xiami':
            audioDom = window.xiami.audio;
            break;
        }

        audioDom = audioDom || document.documentElement.getElementsByTagName('audio')[0];

        if (!audioDom) {
            if (AUDIO_TIMER++ < MAX_AUDIO_TIME) {
                setTimeout(getAudioDom, 200);
            } else {
                var infos = [];
                var bodyElement = document.getElementsByTagName('body')[0] || {};

                infos.push('title:' + document.title);
                infos.push('bodyChildElementCount:' + bodyElement.childElementCount);
                infos.push('xiamiAudio:' + !!window.xiami.audio);
                infos.push('querySelector:' + !!document.querySelector('audio'));
                infos.push('getElementsByTagName:' + !!document.getElementsByTagName('audio')[0]);

                wdjNative.sendError('timeout', infos.join(','));
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

        if (getSource() === 'xiami') {
            audioDom.autoplay = true;

            if (!!audioDom.src) {
                alert('reset src');
                audioDom.src = audioDom.src;
            }
        }
    }

    getAudioDom();
}(window);
