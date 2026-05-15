let user = {}; // {id, username, email, avatar, bio}

document.addEventListener("DOMContentLoaded", () => {
    loadUser();
    setupEvents();
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
    // setInterests(user);
    setAvatar(user);
    return user;
}

// Displays username
const fillUsername = (user) => {
    const username = user["username"];
    const location = document.getElementById("username-display");
    location.innerHTML = `<p> ${username} </p>`;
};

// Displays email
const fillEmail = (user) => {
    const email = user["email"];
    const location = document.getElementById("user-email");
    location.innerHTML = `<p> ${email} </p>`;
};

// Displays bio (if populated)
const fillBio = (user) => {
    const bio = user["bio"];
    if (bio != null) {
        const location = document.getElementById("user-bio");
        location.innerHTML = `<p> ${bio} </p>`;
    }
};

// set interests

// Displays the user's chosen avatar
const setAvatar = (user) => {
    const avatar = user["avatar"];
    const location = document.getElementById("profile-picture");
    location.innerHTML = `<p> ${avatar} </p>`;
}

// Adds all event listeners
const setupEvents = () => {
    document.getElementById("btn-change-avatar").onclick = () => showAvatarDialog();
}

// Activates dialog for changing avatar
const showAvatarDialog = () => {
    const avatarDialog = document.getElementById("avatar-dialog");
    avatarDialog.classList.add('open');

    const current = user["avatar"];
    let selectedAvatar;
    let selectedElement;

    const av_1 = document.getElementById("av-1");
    const av_2 = document.getElementById("av-2");
    const av_3 = document.getElementById("av-3");
    const av_4 = document.getElementById("av-4");
    const av_5 = document.getElementById("av-5");
    const av_6 = document.getElementById("av-6");

    switch (current) {
        case "avatar_1":
            av_1.classList.add("chosen");
            selectedAvatar = av_1;
            selectedElement = "avatar_1";
            break;
        case "avatar_2":
            av_2.classList.add("chosen");
            selectedAvatar = av_2;
            selectedElement = "avatar_2";
            break;
        case "avatar_3":
            av_3.classList.add("chosen");
            selectedAvatar = av_3;
            selectedElement = "avatar_3";
            break;
        case "avatar_4":
            av_4.classList.add("chosen");
            selectedAvatar = av_4;
            selectedElement = "avatar_4";
            break;
        case "avatar_5":
            av_5.classList.add("chosen");
            selectedAvatar = av_5;
            selectedElement = "avatar_5";
            break;
        case "avatar_6":
            av_6.classList.add("chosen");
            selectedAvatar = av_6;
            selectedElement = "avatar_6";
            break;
    }

    av_1.onclick = () => { selectedAvatar = clickAvatar(av_1, selectedAvatar); selectedElement = "avatar_1"; };
    av_2.onclick = () => { selectedAvatar = clickAvatar(av_2, selectedAvatar); selectedElement = "avatar_2"; };
    av_3.onclick = () => { selectedAvatar = clickAvatar(av_3, selectedAvatar); selectedElement = "avatar_3"; };
    av_4.onclick = () => { selectedAvatar = clickAvatar(av_4, selectedAvatar); selectedElement = "avatar_4"; };
    av_5.onclick = () => { selectedAvatar = clickAvatar(av_5, selectedAvatar); selectedElement = "avatar_5"; };
    av_6.onclick = () => { selectedAvatar = clickAvatar(av_6, selectedAvatar); selectedElement = "avatar_6"; };

    document.getElementById("avatar-close").onclick = () => hideAvatarDialog();
    document.getElementById("avatar-exit").onclick = () => hideAvatarDialog();

    document.getElementById("avatar-save").onclick = async () => {
        if (selectedElement === current) hideAvatarDialog();
        else {
            await fetch(`/api/user/avatar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar: selectedElement })
            });
            user["avatar"] = selectedElement;
            hideAvatarDialog();
            setAvatar(user);
        }
    }
}

// Sets the selected avatar
const clickAvatar = (clicked, current) => {
    current.classList.remove("chosen");
    clicked.classList.add("chosen");
    return clicked;
}

// Closes dialog for changing avatar
const hideAvatarDialog = () => {
    const avatarDialog = document.getElementById("avatar-dialog");
    avatarDialog.classList.remove('open');
}
