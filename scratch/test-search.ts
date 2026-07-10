import google from 'googlethis';

async function testSearch() {
  try {
    const options = {
      page: 0, 
      safe: false,
      additional_params: {
        hl: 'id'
      }
    };
    
    const response = await google.search('berita terbaru hari ini', options);
    console.log(response.results.slice(0, 2));
  } catch (err) {
    console.error(err);
  }
}
testSearch();
