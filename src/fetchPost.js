async function fetchPost(callback) {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    callback(null, await response.json());
  } catch (error) {
    callback(error);
  }
}

module.exports = fetchPost;
