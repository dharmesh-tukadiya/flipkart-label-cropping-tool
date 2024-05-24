document.addEventListener('DOMContentLoaded', async function () {
    document.getElementById('download-form').onsubmit = function () {
        event.preventDefault();
        process();
    }
    if (!window.navigator.onLine) {
        alert('You are offline!!');
        let x = window.setInterval(() => {
            if (window.navigator.onLine) {
                window.clearInterval(x);
                loadDefaults();
            }
        }, 500)
    } else {
        loadDefaults();
    }

});
async function loadDefaults() {
    let locations = await getLocations().catch(error => {
        document.querySelector('.gathering-shipments-log').innerHTML = document.querySelector('.gathering-shipments-log').innerHTML + "<br>Error Occured While Getting Locations/WareHouses!!<br>Please Login To <a href='https://seller.flipkart.com' target='_blank'>Seller Dashboard<a>. & Try Again!!";
    }) ?? [];
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.locationId;
        option.text = location.name;
        if (location.locationDesc = "Default location") {
            option.selected = 'selected';
        }
        document.querySelector('#location').appendChild(option);
    });
    let deliveryVendors = await getDeliveryVendors().catch(error => { }) ?? [];
    deliveryVendors.forEach(deliveryVendor => {
        const option = document.createElement('option');
        option.value = deliveryVendor.vendor_group_code;
        option.text = deliveryVendor.vendor_group_code;
        option.selected = 'selected';
        document.querySelector('#delivery_vendors').appendChild(option);
    });
}