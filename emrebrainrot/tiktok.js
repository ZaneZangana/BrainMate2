console.log("🚀 tiktok2.js script started");

(async () => {
    console.log("📥 Starting randomized script execution");

    const videoContainer = document.getElementById("video-list");

    if (!videoContainer) {
        console.error("❌ video-list container not found.");
        return;
    }

    let videos = [];
    try {
        console.log("🔄 Fetching videos.json...");
        const res = await fetch('videos.json');
        videos = await res.json();
        console.log("📦 Videos loaded:", videos);
    } catch (err) {
        console.error("🚨 Failed to fetch videos.json:", err);
        return;
    }

    function shuffleVideos(videos) {
        for (let i = videos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [videos[i], videos[j]] = [videos[j], videos[i]];
        }
        return videos;
    }

    videos = shuffleVideos(videos);

    videos.forEach(video => {
        const videoWrapper = document.createElement("div");
        videoWrapper.classList.add("video", "bg-white", "flex", "items-center", "justify-center", "relative");

        videoWrapper.innerHTML = `
            <video src="${video.url}" class="w-full h-full object-cover"></video>
            <div class="controls absolute right-2 top-1/2 -translate-y-1/2 flex flex-col space-y-2">
                <button class="like-button" data-id="${video.id}">❤️</button>
                <button class="skip-button" data-id="${video.id}">❌</button>
            </div>
        `;

        const videoElem = videoWrapper.querySelector("video");
        videoContainer.appendChild(videoWrapper);

        videoElem.addEventListener("click", () => {
            if (videoElem.paused) {
                videoElem.play().catch(err => console.log(err));
            } else {
                videoElem.pause();
            }
        });

        let startTime = 0;
        videoElem.addEventListener("play", () => {
            startTime = Date.now();
        });

        videoWrapper.querySelector(".like-button")
            .addEventListener("click", () => console.log(`Liked video: ${video.title}`));
        videoWrapper.querySelector(".skip-button")
            .addEventListener("click", () => console.log(`Skipped video: ${video.title}`));
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const vid = entry.target;
            if (entry.isIntersecting) {
                vid.play().catch(err => console.log(err));
            } else {
                vid.pause();
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll("video").forEach(videoElem => {
        observer.observe(videoElem);
    });
})();
