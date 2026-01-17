import axios from 'axios';

const BASE_URL = ''; // Use relative path for proxy

export const calcDeliveryPathAsGeoJson = async (dispatches) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/v1/calcDeliveryPathAsGeoJson`, dispatches);
        return response.data;
    } catch (error) {
        console.error('Error calculating delivery path:', error);
        throw error;
    }
};

export const calcDeliveryPath = async (dispatches) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/v1/calcDeliveryPath`, dispatches);
        return response.data;
    } catch (error) {
        console.error('Error calculating delivery path:', error);
        throw error;
    }
};

export const queryAvailableDrones = async (request) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/v1/queryAvailableDrones`, request);
        return response.data;
    } catch (error) {
        console.error('Error querying available drones:', error);
        throw error;
    }
};
