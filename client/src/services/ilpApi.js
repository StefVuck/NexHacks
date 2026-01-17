import axios from 'axios';

const BASE_URL = '/ilp-api';

export const getDrones = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/drones`);
        return response.data;
    } catch (error) {
        console.error('Error fetching drones:', error);
        throw error;
    }
};

export const getServicePoints = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/service-points`);
        return response.data;
    } catch (error) {
        console.error('Error fetching service points:', error);
        throw error;
    }
};

export const getDronesForServicePoints = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/drones-for-service-points`);
        return response.data;
    } catch (error) {
        console.error('Error fetching drones for service points:', error);
        throw error;
    }
};

export const getRestrictedAreas = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/restricted-areas`);
        return response.data;
    } catch (error) {
        console.error('Error fetching restricted areas:', error);
        throw error;
    }
};
