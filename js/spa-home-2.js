
  fetch('meny.html')
    .then(response => {
      if (!response.ok) throw new Error('Fant ikke meny.html');
      return response.text();
    })
    .then(data => {
      document.getElementById('nav-placeholder').outerHTML = data;
      if (typeof initNav === 'function') initNav(); // Kjører meny-JS på nytt
    })
    .catch(err => console.error('Feil ved lasting av meny:', err));
