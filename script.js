
const API_KEY = "AIzaSyDDgwADV1ZOb4hWOOZltboU5S9vhMMO1lA";
let booksData = [];
let myLibraryBooks = [];

async function loadTrendingBooks() {
    try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=trending&maxResults=10&key=${API_KEY}`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        booksData = data.items || [];
        populateFilters(booksData);
        displayResults(booksData, "results");
    } catch (err) {
        console.warn("API fetch failed, loading fallback books.", err);
        loadFallbackBooks();
    }
}

function loadFallbackBooks() {
    booksData = [
        {
            id: "fallback1",
            volumeInfo: {
                title: "fallback Book One",
                authors: ["Author A"],
                description: "This is a fallback description for Book One.",
                publishedDate: "2024",
                averageRating: 4,
                imageLinks: { thumbnail: "https://via.placeholder.com/150" },
                previewLink: "#"
            }
        },
        {
            id: "fallback2",
            volumeInfo: {
                title: "fallback Book Two",
                authors: ["Author B"],
                description: "This is a fallback description for Book Two.",
                publishedDate: "2023",
                averageRating: 5,
                imageLinks: { thumbnail: "https://via.placeholder.com/150" },
                previewLink: "#"
            }
        }
    ];
    populateFilters(booksData);
    displayResults(booksData, "results");
}

function loadMyLibrary() {
    const myLibraryDiv = document.getElementById("myLibrary");
    myLibraryDiv.innerHTML = "";
    myLibraryBooks = [];

    let library = JSON.parse(localStorage.getItem("myLibrary")) || [];
    if (!library.length) {
        myLibraryDiv.innerHTML = '<p>Your Library is Empty.</p>';
        return;
    }

    // Filter out fallback books to prevent API calls for non-existent IDs
    const realBookIds = library.filter(book => !book.id.startsWith("fallback"));
    const fallbackBooks = library.filter(book => book.id.startsWith("fallback"));

    // Fetch books from API
    Promise.all(
        realBookIds.map(book => fetch(`https://www.googleapis.com/books/v1/volumes/${book.id}?key=${API_KEY}`)
            .then(res => res.json()))
    ).then(apiResults => {
        myLibraryBooks = [...apiResults, ...fallbackBooks];
        populateFilters(myLibraryBooks);
        displayResults(myLibraryBooks, "myLibrary");
    });
}

function removeAllFromLibrary() {
    if (confirm("Are you sure you want to remove all books from your library")) {
        localStorage.removeItem("myLibrary");
        loadMyLibrary();
    }
}

function searchBooks() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return alert("Please enter a search term.");
    document.getElementById("clearSearchBtn").style.display = 'inline-block';
    document.getElementById("myLibrarySection").style.display = 'none';
    document.getElementById("results").style.display = 'grid';
    fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&key=${API_KEY}`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return res.json();
        })
        .then(data => {
            booksData = data.items || [];
            populateFilters(booksData);
            displayResults(booksData, "results");
        })
        .catch(err => {
            console.error("Fetch error:", err);
            alert('Failed to fetch books. Check your API key or restrictions.');
        });
}

function clearSearch() {
    document.getElementById("searchInput").value = "";
    document.getElementById("clearSearchBtn").style.display = "none";
    document.getElementById("results").innerHTML = '';
}

function displayResults(books, targetDivId) {
    const container = document.getElementById(targetDivId);
    container.innerHTML = '';
    if (!books.length) {
        container.innerHTML = '<p> No books Found.</p>';
        return;
    }
    books.forEach(book => {
        const info = book.volumeInfo;
        const isSaved = checkIfSaved(book);
        const ratingStars = getStars(info.averageRating);
        const card = document.createElement("div");
        card.className = "book-card";
        card.innerHTML = `
            <img src="${info.imageLinks?.thumbnail || 'https://via.placeholder.com/150'}" alt="${info.title}">
            <h3>${info.title}</h3>
            <p>${ratingStars}</p>
            <p><strong>Description:</strong> ${info.description ? info.description.substring(0, 60) + "..." : "No Description Avilable."}</p>
            <p><strong>Author:</strong> ${info.authors ? info.authors.join(", ") : "Unknown"}</p>
            <p><strong>Published:</strong> ${info.publishedDate || 'N/A'}</p>
            <div class="card-button">
                <button class="Preview-btn" onclick="openPreview('${info.previewLink}')">📖 Read Preview</button>
                <button class="heart-btn ${isSaved ? "saved" : " "}"
                    onclick="toggleLibrary('${book.id}', this)">${isSaved ? '❤️' : '🤍'}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function openPreview(previewLink) {
    if (!previewLink || previewLink === 'undefined') { // Added check for undefined
        alert("No preview avilable for this book.");
        return;
    }
    window.open(previewLink, "_blank");
}

function toggleLibrary(bookId, btn) {
    let library = JSON.parse(localStorage.getItem("myLibrary")) || [];
    let book = booksData.find(b => b.id === bookId) || myLibraryBooks.find(b => b.id === bookId);
    if (!book) return; // safety check

    const index = library.findIndex(b => b.id === bookId);

    if (index !== -1) {
        library.splice(index, 1);
        btn.innerHTML = '🤍';
        btn.classList.remove("saved");
    } else {
        library.push(book);
        btn.innerHTML = '❤️';
        btn.classList.add("saved");
    }

    localStorage.setItem("myLibrary", JSON.stringify(library));
    if (document.getElementById("myLibrarySection").style.display === 'block') {
        loadMyLibrary();
    }
}

function checkIfSaved(book) {
    let library = JSON.parse(localStorage.getItem("myLibrary")) || [];
    return library.some(b => b.id === book.id);
}

function getStars(rating) {
    if (!rating) return "⭐ N/A";
    return "⭐".repeat(Math.floor(rating)) + `(${rating}/5)`;
}

function populateFilters(books) {
    const authorSet = new Set();
    books.forEach(book => {
        if (book.volumeInfo.authors) {
            book.volumeInfo.authors.forEach(author => authorSet.add(author));
        }
    });
    const authorFilter = document.getElementById("authorFilter");
    authorFilter.innerHTML = `<option value=""> Filter By Author</option>`;
    authorSet.forEach(author => {
        authorFilter.innerHTML += `<option value="${author}">${author}</option>`;
    });
}

function applyFilters() {
    const selectedAuthor = document.getElementById("authorFilter").value;
    const selectedRating = parseFloat(document.getElementById("ratingFilter").value);
    let currentBooks = document.getElementById("myLibrarySection").style.display === 'block' ? myLibraryBooks : booksData;
    let filterBooks = currentBooks.filter(book => {
        const info = book.volumeInfo;
        const authorMatch = selectedAuthor ? info.authors?.includes(selectedAuthor) : true;
        const ratingMatch = selectedRating ? info.averageRating >= selectedRating : true;
        return authorMatch && ratingMatch;
    });
    const targetDiv = document.getElementById("myLibrarySection").style.display === 'block' ? "myLibrary" : "results";
    displayResults(filterBooks, targetDiv);
}

function showHome() {
    document.getElementById("results").style.display = 'grid';
    document.getElementById("myLibrarySection").style.display = 'none';
    loadTrendingBooks();
}

function toggleTheme() {
    document.body.classList.toggle("light-theme");
    const themeIcon = document.getElementById("themeToggle");
    themeIcon.textContent = document.body.classList.contains("light-theme") ? "☀️" : "🌛";
}

function showLibrary() {
    document.getElementById("results").style.display = 'none';
    document.getElementById("myLibrarySection").style.display = 'block';
    loadMyLibrary();
}

document.getElementById("searchInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") searchBooks();
});

window.onload = loadTrendingBooks;
