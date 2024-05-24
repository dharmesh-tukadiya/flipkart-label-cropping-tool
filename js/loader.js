window.addEventListener('update-loader', (event) => {
    const percentage = event.detail.percentage;
    const loaderElem = event.detail.loaderElem;
    const percentageElem = event.detail.percentageElem;
    percentageElem && (percentageElem.innerHTML = parseInt(percentage) + "%");
    loaderElem && (loaderElem.style.width = parseInt(percentage) + "%");
});