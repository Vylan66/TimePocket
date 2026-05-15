let user = {}; // {id, username, email, avatar, bio}

document.addEventListener("DOMContentLoaded", () => {
    loadUser();

});

const loadUser = async () => {
    const result = await fetch('/api/user');
    if (!result.ok) {
        return;
    }
    const data = await result.json();
    user = data;

    fillUsername(user);
    fillEmail(user);
    fillBio(user);
    setAvatar(user);
}

const fillUsername = (user) => {
    const username = user["username"];
    const location = document.getElementById("username-display");
    location.innerHTML = `<p> ${username} </p>`;
};

const fillEmail = (user) => {
    const email = user["email"];
    const location = document.getElementById("user-email");
    location.innerHTML = `<p> ${email} </p>`;
};

const fillBio = (user) => {
    const bio = user["bio"];
    if (bio != null) {
        const location = document.getElementById("user-bio");
        location.innerHTML = `<p> ${bio} </p>`;
    }
};

// set interests

const setAvatar = (user) => {
    const avatar = user["avatar"];
    const location = document.getElementById("profile-picture");
    location.innerHTML = `<p> ${avatar} </p>`;
}