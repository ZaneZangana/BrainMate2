document.addEventListener('DOMContentLoaded', async () => {
    const videoContainer = document.getElementById("video-list");

    // Basic iOS check
    //const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // Load video data from JSON file
    let videos = await fetch('videos.json').then(res => res.json());

    let userData = JSON.parse(localStorage.getItem("userData")) || {};
        
    // Ensure our defaults are in place:
    userData = {
      likedTopics: userData.likedTopics || {},
      watched: userData.watched || {},
      skipped: userData.skipped || [],
      watchedVideos: userData.watchedVideos || [],
      minorTopics: userData.minorTopics || {}
    };

    // Function to update user data in localStorage
    function saveUserData() {
        localStorage.setItem("userData", JSON.stringify(userData));
    }

    // Function to normalize liked topics so that their sum is always 1
    function normalizeLikedTopics() {
        let total = Object.values(userData.likedTopics).reduce((sum, val) => sum + val, 0);
        if (total > 0) {
            Object.keys(userData.likedTopics).forEach(topic => {
                userData.likedTopics[topic] /= total;
            });
        }
    }

    // Function to normalize minor topics so that their sum is always 1
    function normalizeMinorTopics() {
        let total = Object.values(userData.minorTopics).reduce((sum, val) => sum + val, 0);
        if (total > 0) {
            Object.keys(userData.minorTopics).forEach(topic => {
                userData.minorTopics[topic] /= total;
            });
        }
    }

    // Sort videos based on user preferences
    function personalizeVideos() {
        normalizeLikedTopics();
        normalizeMinorTopics();
        return videos.sort((a, b) => {
            const scoreA = Object.keys(a.topics).reduce(
                (sum, topic) => sum +
                    (userData.likedTopics[topic] || 0) * a.topics[topic] +
                    (userData.minorTopics[topic] || 0) * a.topics[topic],
                0
            );
            const scoreB = Object.keys(b.topics).reduce(
                (sum, topic) => sum +
                    (userData.likedTopics[topic] || 0) * b.topics[topic] +
                    (userData.minorTopics[topic] || 0) * b.topics[topic],
                0
            );
            return scoreB - scoreA; // Sort by highest relevance
        });
    }

    // Apply personalization
    videos = personalizeVideos();

    // Render videos dynamically
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

        // Click to toggle play/pause on the video itself
        videoElem.addEventListener("click", () => {
            if (videoElem.paused) {
                videoElem.play().catch(err => console.log(err));
            } else {
                videoElem.pause();
            }
        });

        // Track watch time
        let startTime = 0;
        videoElem.addEventListener("play", () => {
            startTime = Date.now();
        });

        // Like/Skip Buttons
        videoWrapper.querySelector(".like-button")
            .addEventListener("click", () => likeVideo(video.id, startTime));
        videoWrapper.querySelector(".skip-button")
            .addEventListener("click", () => skipVideo(video.id, startTime));
    });

    // Autoplay/pause videos when in/out of view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const vid = entry.target;
            if (entry.isIntersecting) {
                // Attempt to play (muted if iOS or no user interaction)
                vid.play().catch(err => console.log(err));
            } else {
                vid.pause();
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll("video").forEach(videoElem => {
        observer.observe(videoElem);
    });

    // Like a video
    function likeVideo(videoId, startTime) {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;

        const watchDuration = (Date.now() - startTime) / 1000; // Convert to seconds
        const maxDuration = 60; // Assume a video max duration of 60s
        const watchPercentage = Math.min(1, watchDuration / maxDuration);

        // If watched less than 50%, increase interest more
        const interestFactor = watchPercentage < 0.5 ? 1.5 : 1.0;

        // Update liked topics
        Object.keys(video.topics).forEach(topic => {
            userData.likedTopics[topic] =
                (userData.likedTopics[topic] || 0) + (video.topics[topic] * interestFactor);
        });

        // Update minor topics
        const dominantTopic = Object.keys(video.topics)
            .reduce((a, b) => video.topics[a] > video.topics[b] ? a : b);
        Object.keys(video.topics).forEach(topic => {
            if (topic !== dominantTopic) {
                userData.minorTopics[topic] =
                    (userData.minorTopics[topic] || 0) + (video.topics[topic] * 0.5);
            }
        });

        userData.watched[videoId] = true;
        if (!userData.watchedVideos.includes(videoId)) {
            userData.watchedVideos.push(videoId);
        }

        normalizeLikedTopics();
        normalizeMinorTopics();
        saveUserData();

        console.log(`Video Liked: ${video.title}`);
        console.log("Watch Duration:", watchDuration, "seconds");
        console.log("Updated Liked Topics:", userData.likedTopics);
        console.log("Updated Minor Topics:", userData.minorTopics);
    }

    // Skip a video
    function skipVideo(videoId, startTime) {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;

        const watchDuration = (Date.now() - startTime) / 1000;
        const maxDuration = 60;
        const watchPercentage = Math.min(1, watchDuration / maxDuration);

        // Find dominant topic (highest weight)
        let dominantTopic = Object.keys(video.topics).reduce(
            (a, b) => (video.topics[a] > video.topics[b] ? a : b)
        );

        // Reduce interest based on watch time
        const penaltyFactor = watchPercentage > 0.7 ? 2.0 : 1.0;
        userData.likedTopics[dominantTopic] = Math.max(
            0,
            (userData.likedTopics[dominantTopic] || 0) - (video.topics[dominantTopic] * penaltyFactor)
        );

        userData.skipped.push(videoId);
        saveUserData();
        normalizeLikedTopics();

        console.log(`Video Skipped: ${video.title}`);
        console.log("Watch Duration:", watchDuration, "seconds");
        console.log("Dominant Topic:", dominantTopic);
        console.log("Updated Liked Topics:", userData.likedTopics);
    }

    // Display summary after 10 videos watched
    function displaySummary() {
        if (userData.watchedVideos.length >= 10) {
            let questions = [];
            userData.watchedVideos.forEach(videoId => {
                const video = videos.find(v => v.id === videoId);
                if (video && video.suggested_questions) {
                    questions.push(...video.suggested_questions);
                }
            });

            alert("Summary of Topics Learned:\n" + questions.join("\n"));
            console.log("Suggested Questions:", questions);
        }
    }

    setInterval(displaySummary, 10000); // Check every 10s
});
