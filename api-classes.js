const BASE_URL = 'https://hack-or-snooze-v3.herokuapp.com';

// Class to handle story instances - fetch, add, and remove stories
class StoryList {
	constructor(stories) {
		this.stories = stories;
	}

	// get stories from API
	static async getStories() {
		const response = await axios.get(`${BASE_URL}/stories`);
		const stories = response.data.stories.map((story) => new Story(story));
		const storyList = new StoryList(stories);
		return storyList;
	}

	// POST to /stories and add to stories list
	async addStory(user, newStory) {
		const userData = {
			token : user.loginToken,
			story : newStory
		};
		const response = await axios({
			method : 'POST',
			url    : `${BASE_URL}/stories`,
			data   : userData
		});

		newStory = new Story(response.data.story);
		this.stories.unshift(newStory);
		user.ownStories.unshift(newStory);
		return newStory;
	}
	// lets user remove their stories
	async removeStory(user, storyId) {
		await axios({
			url    : `${BASE_URL}/stories/${storyId}`,
			method : 'DELETE',
			data   : {
				token : user.loginToken
			}
		});

		this.stories = this.stories.filter((story) => story.storyId !== storyId);
		user.ownStories = user.ownStories.filter((s) => s.storyId !== storyId);
	}
}

// Class to represent logged in user
class User {
	constructor(userObj) {
		this.username = userObj.username;
		this.name = userObj.name;
		this.createdAt = userObj.createdAt;
		this.updatedAt = userObj.updatedAt;

		this.loginToken = '';
		this.favorites = [];
		this.ownStories = [];
	}

	// sign up new user using post request
	static async create(username, password, name) {
		const response = await axios.post(`${BASE_URL}/signup`, {
			user : {
				username,
				password,
				name
			}
		});
		const newUser = new User(response.data.user);
		newUser.loginToken = response.data.token;
		return newUser;
	}

	// Use existing username and password combo to login user
	static async login(username, password) {
		const response = await axios.post(`${BASE_URL}/login`, {
			user : {
				username,
				password
			}
		});

		const existingUser = new User(response.data.user);
		existingUser.favorites = response.data.user.favorites.map((s) => new Story(s));
		existingUser.ownStories = response.data.user.stories.map((s) => new Story(s));

		existingUser.loginToken = response.data.token;

		return existingUser;
	}

	// get request to get logged in user and create instance of user using username and token
	static async getLoggedInUser(token, username) {
		if (!token || !username) return null;
		// call the API
		const response = await axios.get(`${BASE_URL}/users/${username}`, {
			params : {
				token
			}
		});

		const existingUser = new User(response.data.user);

		existingUser.loginToken = token;

		existingUser.favorites = response.data.user.favorites.map((s) => new Story(s));
		existingUser.ownStories = response.data.user.stories.map((s) => new Story(s));
		return existingUser;
	}

	// gets user info from API data
	async retrieveDetails() {
		const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
			params : {
				token : this.loginToken
			}
		});

		// set user properties using API data from get request
		this.name = response.data.user.name;
		this.createdAt = response.data.user.createdAt;
		this.updatedAt = response.data.user.updatedAt;
		this.favorites = response.data.user.favorites.map((s) => new Story(s));
		this.ownStories = response.data.user.stories.map((s) => new Story(s));

		return this;
	}

	// post request to API to add favorite to users favorites
	addFavorite(storyId) {
		return this._toggleFavorite(storyId, 'POST');
	}
	// Delete favorite from users favorites
	removeFavorite(storyId) {
		return this._toggleFavorite(storyId, 'DELETE');
	}
	// toggle user favorites
	async _toggleFavorite(storyId, httpVerb) {
		await axios({
			url    : `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
			method : httpVerb,
			data   : {
				token : this.loginToken
			}
		});

		await this.retrieveDetails();
		return this;
	}
}

// Class for a story
class Story {
	constructor(storyObj) {
		this.author = storyObj.author;
		this.title = storyObj.title;
		this.url = storyObj.url;
		this.username = storyObj.username;
		this.storyId = storyObj.storyId;
		this.createdAt = storyObj.createdAt;
		this.updatedAt = storyObj.updatedAt;
	}
}
