$(async function() {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $('#all-articles-list');
	const $submitForm = $('#submit-form'); // +++ form element to submit story
	const $filteredArticles = $('#filtered-articles');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $ownStories = $('#my-articles'); // +++ ul element for holding user's posted stories
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $body = $('body'); // +++ page body element
	const $alert = $('#alert'); // +++ authentication alert box
	const $navWelcome = $('#nav-welcome'); // +++ span element parent to usernam a element
	const $mainNavLinks = $('.main-nav-links'); // +++ navbar links for authenticated users
	const $navSubmit = $('#nav-submit'); // +++ navbar submit link (a element) for authenticated users
	const $navFavorites = $('#nav-favorites'); // +++ navbar favorites link (a element) for authenticated users
	const $navMyStories = $('#nav-my-stories'); // +++ navbar my stories link (a element) for authenticated users
	const $articlesContainer = $('.articles-container'); // +++ main container for articles
	const $navUserProfile = $('#nav-user-profile'); // +++ authenticated username, link to user profile
	const $userProfile = $('#user-profile'); // +++ section element displaying user profile details
	const $favoritedStories = $('#favorited-articles'); // +++ ul element to append user's favorited stories

	// global storyList and currentUser variables
	let storyList = null;
	let currentUser = null;

	await checkIfLoggedIn();

	// Event listener for logging in - If successfully we will setup the user instance
	// +++ form displayed after 'login/create user' click
	$loginForm.on('submit', async function(e) {
		e.preventDefault();

		const username = $('#login-username').val();
		const password = $('#login-password').val();
		try {
			const userInstance = await User.login(username, password);
			currentUser = userInstance;
			syncCurrentUserToLocalStorage();
			loginAndSubmitForm();
		} catch (e) {
			const { data } = e.response;
			const { message } = data.error;
			alertMessage(message);
		}
	});

	$createAccountForm.on('submit', async function(e) {
		e.preventDefault();

		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();
		try {
			const newUser = await User.create(username, password, name);
			currentUser = newUser;
			syncCurrentUserToLocalStorage();
			loginAndSubmitForm();
		} catch (e) {
			const { data } = e.response;
			const { message } = data.error;
			alertMessage(message);
		}
	});

	function alertMessage(message, type) {
		$alert.slideDown('slow', function() {
			$alert.text(message).delay(2000).slideUp();
		});
		$alert.text('');
	}

	$submitForm.on('submit', async function(e) {
		e.preventDefault();
		const author = $('#author').val();
		const title = $('#title').val();
		const url = $('#url').val();
		const username = currentUser.username;
		const hostName = getHostName(url);
		const storyPayload = { author, title, url, username };

		const newStory = await storyList.addStory(currentUser, storyPayload);

		const storyMarkup = $(`
      <li id="${newStory.storyId}">
        <span class="star">
          <i class="far fa-star"></i>
        </span>
        <a class="article-link" href="${newStory.url}" target="a_blank">
          <strong>${newStory.title}</strong>
        </a>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-author">by ${newStory.author}</small>
        <small class="article-username">posted by ${newStory.username}</small>
      </li>
    `);

		$allStoriesList.prepend(storyMarkup);

		$submitForm.slideUp('slow').trigger('reset');
	});

	// Login click handler
	$navLogin.on('click', () => {
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	// Logout click handler
	$navLogOut.on('click', () => {
		$mainNavLinks.hide();
		$navUserProfile.text();
		localStorage.clear();
		location.reload();
	});

	// Submit click handler
	$navSubmit.on('click', () => {
		if (currentUser) {
			hideElements();
			$allStoriesList.show();
			$submitForm.slideToggle();
		}
	});

	// Favorites menu bar click handler
	$navFavorites.on('click', () => {
		hideElements();
		createFavorites();
		$favoritedStories.show();
	});

	// User Stories menu bar click handler
	$navMyStories.on('click', () => {
		hideElements();
		createMyStories();
		$ownStories.show();
	});

	// Profile menu bar click handler
	$navUserProfile.on('click', () => {
		hideElements();
		$userProfile.show();
	});

	// Event handler for navigation to favorites
	$body.on('click', 'nav-favorites', () => {
		hideElements();
		if (currentUser) {
			createFavorites();
			$favoritedStories.show();
		}
	});

	// Event Handler for Navigation to homepage
	$body.on('click', '#nav-all', async () => {
		hideElements(); // call hideElements func to hide other page elements
		await generateStories();
		$allStoriesList.show();
	});

	// Event handler for navigation to user stories
	$body.on('click', '#nav-my-stories', () => {
		hideElements();
		if (currentUser) {
			$userProfile.hide();
			createMyStories();
			$ownStories.show();
		}
	});

	// Favorites handler
	$articlesContainer.on('click', '.star', async function(evt) {
		let storyId = $(evt.target).closest('li').attr('id');

		if ($(evt.target).hasClass('far')) {
			await currentUser.addFavorite(storyId);
			$(evt.target).removeClass('far').addClass('fas');
		} else {
			await currentUser.removeFavorite(storyId);
			$(evt.target).removeClass('fas').addClass('far');
		}
	});

	// Deleting stories handler
	$ownStories.on('click', '.trash-can', async function(evt) {
		// add variable to hold target element's id attribute
		let storyId = $(evt.target).closest('li').attr('id');
		if (isFavorite) {
			await currentUser.removeFavorite(storyId);
		}
		await storyList.removeStory(currentUser, storyId);
		await generateStories();
		hideElements();
		$allStoriesList.show();
	});

	//check localStorage to see if loggedin
	async function checkIfLoggedIn() {
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showProfile();
			showNavForLoggedInUser();
		}
	}

	// Hide login info and showed logged in
	function loginAndSubmitForm() {
		$loginForm.hide();
		$createAccountForm.hide();

		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');
		generateStories();
		$allStoriesList.show();
		showNavForLoggedInUser();
		showProfile();
	}

	// show user profile
	function showProfile() {
		$('#profile-name').text(`Name: ${currentUser.name}`);
		$('#profile-username').text(`Username: ${currentUser.username}`);
		$('#profile-account-date').text(`Account Created: ${currentUser.createdAt.slice(0, 10)}`);
		$navUserProfile.text(`${currentUser.username}`);
	}

	//create story instance
	async function generateStories() {
		const storyListInstance = await StoryList.getStories();
		storyList = storyListInstance;
		$allStoriesList.empty();
		for (let story of storyList.stories) {
			const storyLi = generateStoryHTML(story, false, true);
			$allStoriesList.append(storyLi);
		}
	}

	// Render a story for DOM
	function generateStoryHTML(story, isOwnStory) {
		let hostName = getHostName(story.url);
		let star;
		let trash;
		if (isFavorite(story)) {
			star = 'fas';
		} else {
			star = 'far';
		}
		if (isOwnStory) {
			trash = `<span class="trash-can"><i class="fas fa-trash-alt"></i></span>`;
		} else {
			trash = '';
		}
		const storyMarkup = $(`
      <li id="${story.storyId}">
      ${trash}
        <span class="star">
          <i class="${star} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

		return storyMarkup; // return the storyMarkup
	}

	// create list of favorites
	function createFavorites() {
		$favoritedStories.empty();

		if (currentUser.favorites.length === 0) {
			// display message if currentUser's favorites array empty
			$favoritedStories.append(`<p>${currentUser.username} has no favorites...</p>`);
		} else {
			// else, loop over currentUser's favs array, call generateStoryHTML for each story fav item
			for (let story of currentUser.favorites) {
				let favoriteHTML = generateStoryHTML(story, false, true);
				$favoritedStories.append(favoriteHTML);
			}
		}
	}

	// show list of user posts
	function createMyStories() {
		$ownStories.empty();

		if (currentUser.ownStories.length === 0) {
			// if user's ownStories array is empty, display message
			$ownStories.append(`<p>${currentUser.username} has no stories...</p>`);
		} else {
			// else, loop over ownStories array, call generateStoryHTML, append to page
			for (let story of currentUser.ownStories) {
				let ownStoryHTML = generateStoryHTML(story, true);
				$ownStories.append(ownStoryHTML);
			}
		}

		$ownStories.show();
	}

	// Hide elements function
	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$ownStories,
			$loginForm,
			$createAccountForm,
			$userProfile,
			$favoritedStories
		];
		elementsArr.forEach(($elem) => $elem.hide());
	}

	// display logged in users navbar
	function showNavForLoggedInUser() {
		$navLogin.hide();
		$userProfile.hide(); // +++ hide the user profile info section
		$('.main-nav-links, #user-profile').toggleClass('hidden'); // +++ toggleClass to display authenticated user nav links
		$navWelcome.show();
		$navLogOut.show();
	}

	// Return user favorites
	function isFavorite(story) {
		let favStoryIds = new Set();
		if (currentUser) {
			favStoryIds = new Set(currentUser.favorites.map((obj) => obj.storyId));
		}
		return favStoryIds.has(story.storyId);
	}

	// get hostname from url
	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		} else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	// set current user info to localStorage
	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}
});
