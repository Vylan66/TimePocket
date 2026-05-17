let user = {}; // {id, username, email, avatar, bio, interest_1, interest_2, interest_3}
let interests = {}; // each entry in the form 1:"Photography"
let selectedInterests = {};

document.addEventListener("DOMContentLoaded", async () => {
    await loadInterests();
    await loadUser();
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
    setInterests(user);
    setAvatar(user, null);
    return user;
}

const loadInterests = async () => {
    const result = await fetch('/api/interests')
    if (!result.ok) {
        return;
    }
    const data = await result.json();
    for (let i in data) {
        const id = data[i]["id"];
        const name = data[i]["name"];
        interests[id] = name;
    }

    const interestList = document.getElementById("interest-list");
    let n = 0;
    for (let i in interests) {
        if (n === 0) {
            n++;
            continue;
        }
        let interestLabel = buildInterest(interests[i], 1);
        interestLabel.id = `interest_${n}`;
        interestList.appendChild(interestLabel);
        interestLabel.onclick = () => {
            let result = toggleInterestList(i);
            if (result === 1) interestLabel.classList.toggle("chosen");
        }
        n++;
    }
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

// Displays the user's chosen interests
const setInterests = (user) => {
    const userInterests = [user["interest_1"], user["interest_2"], user["interest_3"]];
    let allNull = true;
    const location = document.getElementById("interests-container");
    location.innerHTML = ``;

    for (let int_n in userInterests) {
        if (userInterests[int_n] != "null") {
            allNull = false;
            location.appendChild(buildInterest(interests[userInterests[int_n]], 0));
        }
    }
    if (allNull) {
        location.innerHTML = `<p id="interest-placeholder" class="italic" style="color: var(--text-secondary)"> No interests selected... pick some below! </p>`
    }
}

// Creates an interest label
const buildInterest = (newInterest, type) => { // type=0: on profile, type=1: selection menu
    const newInt = document.createElement('div');
    if (type === 0) {
        newInt.className = 'interest';
        newInt.innerHTML = `${newInterest}`;
        return newInt;
    }
    else {
        newInt.className = 'interest selectable';
        newInt.innerHTML = `${newInterest}`;
        return newInt;
    }
}

// Displays the user's chosen avatar
const setAvatar = (user, old) => {
    const avatar = user["avatar"] + "_big";
    
    if (old === null) {
        const av1 = document.getElementById("avatar_1_big");
        av1.innerHTML = `${user.username[0].toUpperCase()}`
    }
    const location = document.getElementById(avatar);
    location.classList.add('current');

    if (old != null) {
        const oldLocation = document.getElementById(old + "_big");
        oldLocation.classList.remove('current');
    }

}

// Adds all event listeners
const setupEvents = () => {
    document.getElementById("btn-change-avatar").onclick = () => showAvatarDialog();
    document.getElementById("update-bio").onclick = () => showBioDialog();
    document.getElementById("change-email").onclick = () => showEmailDialog();
    document.getElementById("change-username").onclick = () => showUsernameDialog();
    document.getElementById("change-password").onclick = () => showPasswordDialog();
    document.getElementById("logout-button").onclick = () => showLogoutDialog();
    document.getElementById("update-interests").onclick = () => showInterestsDialog();
}

// Activates dialog for choosing interests
const showInterestsDialog = () => {
    const interestDialog = document.getElementById("interest-dialog");
    interestDialog.classList.add('open');

    const interestList = document.getElementById("interest-list");

    document.getElementById("interest-save").onclick = () => saveInterestChanges();

    document.getElementById("interest-close").onclick = () => hideInterestDialog();
    document.getElementById("interest-exit").onclick = () => hideInterestDialog();
}

const toggleInterestList = (num) => {
    let clickedIn = (num in selectedInterests);

    if (clickedIn) {
        delete selectedInterests[num];
        return 1;
    }
    else if (Object.keys(selectedInterests).length < 3) {
        selectedInterests[num] = interests[num];
        return 1;
    }
    else {
        return 0;
    }
}

// Saves changes made to user interests
const saveInterestChanges = async () => {
    let selectedKeys = Object.keys(selectedInterests);
    let selectedLength = selectedKeys.length;
    if (selectedLength === 0) {
        const interestError = document.getElementById("interest-error");
        interestError.innerHTML = `Please select at least one interest.`
        return;
    }
    else if (selectedLength < 3) {
        for (; selectedLength < 3; selectedLength++) {
            selectedKeys.push("0");
        }
    }
    let message = {};
    let n = 1;
    for (let i in selectedKeys) {
        let colName = "int_" + n;
        if (selectedKeys[i] === "0") {
            message[colName] = "null";
        }
        else {
            message[colName] = Number(selectedKeys[i]);
        }
        n++;
    }
    
    await fetch(`/api/user/interests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "int_1": message["int_1"], "int_2": message["int_2"], "int_3": message["int_3"] })
    });
    user["interest_1"] = message["int_1"];
    user["interest_2"] = message["int_2"];
    user["interest_3"] = message["int_3"];
    hideInterestDialog();
    setInterests(user);
}

// Closes interests dialog
const hideInterestDialog = () => {
    const interestDialog = document.getElementById("interest-dialog");
    const interestList = document.getElementById("interest-list");
    const interestElements = interestList.children;
    const interestError = document.getElementById("interest-error");
    interestError.innerHTML = ``;
    interestDialog.classList.remove('open');
    selectedInterests = {};
    for (let j = 0; j < interestElements.length; j++) {
        let i = interestElements[j];
        let i_classes = i.classList;
        
        if (i_classes.length === 3) {
            i.classList.remove("chosen");
        }
    }
}

// Activates dialog for logging out
const showLogoutDialog = () => {
    const logoutDialog = document.getElementById("logout-dialog");
    logoutDialog.classList.add('open');

    document.getElementById("logout-save").onclick = () => confirmLogout();

    document.getElementById("logout-close").onclick = () => hideLogoutDialog();
    document.getElementById("logout-exit").onclick = () => hideLogoutDialog();
}

// Closes password dialog
const hideLogoutDialog = () => {
    const logoutDialog = document.getElementById("logout-dialog");
    logoutDialog.classList.remove('open');
}

// Logs out user
const confirmLogout = () => {
    window.location.href = '/logout';
}

// Activates dialog for changing password
const showPasswordDialog = () => {
    const passwordDialog = document.getElementById("password-dialog");
    passwordDialog.classList.add('open');

    const passwordInputOld = document.getElementById("password-old-input-field");
    const passwordInputNew = document.getElementById("password-new-input-field");

    document.getElementById("password-save").onclick = () => savePasswordChanges(passwordInputOld, passwordInputNew);

    document.getElementById("password-close").onclick = () => hidePasswordDialog();
    document.getElementById("password-exit").onclick = () => hidePasswordDialog();
}

// Saves changes to password
const savePasswordChanges = async (passwordInputOld, passwordInputNew) => {
    const passwordOldError = document.getElementById("password-old-error");
    const passwordNewError = document.getElementById("password-new-error");
    passwordOldError.innerHTML = ``;
    passwordNewError.innerHTML = ``;

    if (passwordInputOld.value === "" || passwordInputNew.value === "") {
        if (passwordInputOld.value === "") passwordOldError.innerHTML = `Please enter your old password.`
        if (passwordInputNew.value === "") passwordNewError.innerHTML = `Please enter your new password.`
        passwordInputNew.value = "";
        passwordInputOld.value = "";
    }
    else {
        const result = await fetch(`/api/user/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password: passwordInputOld.value, new_password: passwordInputNew.value })
        });
        if (!result.ok) {
            passwordOldError.innerHTML = `Current password is incorrect.`;
            passwordInputNew.value = "";
            passwordInputOld.value = "";
            return;
        }
        else {
            const data = await result.json();
            if (data["success"]) {
                hidePasswordDialog();
            }
        }
    }
}

// Closes password dialog
const hidePasswordDialog = () => {
    const passwordDialog = document.getElementById("password-dialog");
    const passwordOldInput = document.getElementById("password-old-input-field");
    const passwordNewInput = document.getElementById("password-new-input-field");
    const passwordOldError = document.getElementById("password-old-error");
    const passwordNewError = document.getElementById("password-new-error");
    passwordNewError.innerHTML = ``;
    passwordOldError.innerHTML = ``;
    passwordOldInput.value = "";
    passwordNewInput.value = "";
    passwordDialog.classList.remove('open');
}

// Activates dialog for changing username
const showUsernameDialog = () => {
    const usernameDialog = document.getElementById("username-dialog");
    usernameDialog.classList.add('open');

    const usernameInput = document.getElementById("username-input-field");

    document.getElementById("username-save").onclick = () => saveUsernameChanges(usernameInput);

    document.getElementById("username-close").onclick = () => hideUsernameDialog();
    document.getElementById("username-exit").onclick = () => hideUsernameDialog();
}

// Saves changes to username
const saveUsernameChanges = async (usernameInput) => {
    const usernameError = document.getElementById("username-error");

    if (usernameInput.value === "") {
        usernameError.innerHTML = `Please enter a username.`
    }
    else {
        await fetch(`/api/user`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput.value })
        });
        user["username"] = usernameInput.value;
        hideUsernameDialog();
        fillUsername(user);
    }
}

// Closes username dialog
const hideUsernameDialog = () => {
    const usernameDialog = document.getElementById("username-dialog");
    const usernameInput = document.getElementById("username-input-field");
    const usernameError = document.getElementById("username-error");
    usernameError.innerHTML = ``;
    usernameInput.value = "";
    usernameDialog.classList.remove('open');
}

// Activates dialog for changing email
const showEmailDialog = () => {
    const emailDialog = document.getElementById("email-dialog");
    emailDialog.classList.add('open');

    const emailInput = document.getElementById("email-input-field");

    document.getElementById("email-save").onclick = () => saveEmailChanges(emailInput);

    document.getElementById("email-close").onclick = () => hideEmailDialog();
    document.getElementById("email-exit").onclick = () => hideEmailDialog();
}

// Saves changes made to email
const saveEmailChanges = async (emailInput) => {
    const emailError = document.getElementById("email-error");

    if (emailInput.value === "") {
        emailError.innerHTML = `Please enter an email.`;
    }
    else if (!emailInput.checkValidity()) {
        emailError.innerHTML = `Please enter a valid email.`;
    }
    else {
        await fetch(`/api/user`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput.value })
        });
        user["email"] = emailInput.value;
        hideEmailDialog();
        fillEmail(user);
    }
}

// Closes email dialog
const hideEmailDialog = () => {
    const emailDialog = document.getElementById("email-dialog");
    const emailInput = document.getElementById("email-input-field");
    const emailError = document.getElementById("email-error");
    emailError.innerHTML = ``;
    emailInput.value = "";
    emailDialog.classList.remove('open');
}

// Activates dialog for updating bio
const showBioDialog = () => {
    const bioDialog = document.getElementById("bio-dialog");
    bioDialog.classList.add('open');

    const bioInput = document.getElementById("bio-input-field");
    const currentBio = user["bio"];
    if (currentBio != null) {
        bioInput.value = currentBio;
    }
    updateCharCount(bioInput);

    bioInput.oninput = () => updateCharCount(bioInput);

    document.getElementById("bio-save").onclick = () => saveBioChanges(bioInput.value, currentBio);

    document.getElementById("bio-close").onclick = () => hideBioDialog();
    document.getElementById("bio-exit").onclick = () => hideBioDialog();
}

// Updates the character count of bio input
const updateCharCount = (bioInput) => {
    const charCount = bioInput.value.length;
    const displayCount = document.getElementById("bio-char-count");
    displayCount.innerHTML = charCount;
}

// Saves changes made to bio
const saveBioChanges = async (bioInput, currentBio) => {
    if (bioInput === currentBio) {
        hideBioDialog();
    }
    else if (bioInput === "") {
        const errorMessage = document.getElementById("bio-error");
        errorMessage.innerHTML = `Bio needs at least 1 character.`
    }
    else {
        await fetch(`/api/user/bio`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: bioInput })
        });
        user["bio"] = bioInput;
        hideBioDialog();
        fillBio(user);
    }
}

// Closes dialog for updating bio
const hideBioDialog = () => {
    const bioDialog = document.getElementById("bio-dialog");
    const bioInput = document.getElementById("bio-input-field");
    const bioError = document.getElementById("bio-error");
    bioError.innerHTML = ``;
    bioInput.value = "";
    bioDialog.classList.remove('open');
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

    av_1.innerHTML = `<p class="text-white text-[36px] font-bold"> ${user.username[0].toUpperCase()} </p>`

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
            setAvatar(user, current);
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
