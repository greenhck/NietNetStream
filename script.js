document.addEventListener('DOMContentLoaded', () => {
    const videoPlayerContainer = document.getElementById('video-player-container');
    const defaultBanner = document.getElementById('default-banner');
    const shakaContainerWrapper = document.getElementById('shaka-container-wrapper');
    const shakaVideoPlayer = document.getElementById('shaka-video-player');
    const hlsVideoPlayer = document.getElementById('hls-video-player');
    const navTabsContainer = document.getElementById('nav-tabs-container');
    const contentDisplay = document.getElementById('content-display');

    let hls;
    let shakaPlayer;

    // 탭 생성
    APP_CONFIG.tabs.forEach(tab => {
        const button = document.createElement('button');
        button.className = 'tab-button';
        button.dataset.tab = tab.id;
        button.textContent = tab.name;
        button.addEventListener('click', () => loadAndDisplayChannels(tab.id));
        navTabsContainer.appendChild(button);
    });

    // 채널 로드 및 표시
    async function loadAndDisplayChannels(tabId) {
        const tab = APP_CONFIG.tabs.find(t => t.id === tabId);
        if (!tab) return;

        const response = await fetch(tab.url);
        const data = await response.text();

        let channels;
        if (tab.type === 'json') {
            channels = JSON.parse(data);
        } else { // m3u
            channels = parseM3U(data);
        }

        displayChannels(channels);
    }

    // 채널 표시
    function displayChannels(channels) {
        contentDisplay.innerHTML = '';
        channels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.innerHTML = `<img src="${channel.logo}" alt="${channel.name}" loading="lazy"><div class="name">${channel.name}</div>`;
            card.addEventListener('click', () => playChannel(channel));
            contentDisplay.appendChild(card);
        });
    }
    
    // M3U 파서
    function parseM3U(data) {
        const lines = data.split('\n');
        const channels = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF')) {
                const info = lines[i];
                const name = info.substring(info.lastIndexOf(',') + 1);
                const logo = info.match(/tvg-logo="([^"]*)"/)?.[1] || '';
                const link = lines[++i];
                channels.push({ name, logo, link });
            }
        }
        return channels;
    }

    // 채널 재생
    function playChannel(channel) {
        stopPlayers();
        defaultBanner.style.display = 'none';

        if (channel.link.endsWith('.m3u8')) {
            playHLS(channel);
        } else if (channel.link.endsWith('.mpd')) {
            playDASH(channel);
        }
    }

    // HLS 재생
    function playHLS(channel) {
        hlsVideoPlayer.style.display = 'block';
        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(channel.link);
            hls.attachMedia(hlsVideoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => hlsVideoPlayer.play());
        } else if (hlsVideoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            hlsVideoPlayer.src = channel.link;
            hlsVideoPlayer.addEventListener('loadedmetadata', () => hlsVideoPlayer.play());
        }
    }

    // DASH 재생
    async function playDASH(channel) {
        shakaContainerWrapper.style.display = 'block';
        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            shakaPlayer = new shaka.Player(shakaVideoPlayer);
            try {
                await shakaPlayer.load(channel.link);
                shakaVideoPlayer.play();
            } catch (error) {
                console.error('Error loading Shaka Player:', error);
            }
        }
    }

    // 플레이어 중지
    function stopPlayers() {
        if (hls) {
            hls.destroy();
            hls = null;
        }
        if (shakaPlayer) {
            shakaPlayer.destroy();
            shakaPlayer = null;
        }
        hlsVideoPlayer.style.display = 'none';
        shakaContainerWrapper.style.display = 'none';
        defaultBanner.style.display = 'flex';
    }

    // 초기 로드
    loadAndDisplayChannels(APP_CONFIG.tabs[0].id);
});
