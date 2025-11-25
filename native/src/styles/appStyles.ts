// src/styles/appStyles.ts

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#0F172A', // slate-900 dark background
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A', // slate-900 dark background
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#FFFFFF', // text-white
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 15,
        marginBottom: 10,
        color: '#D1D5DB', // text-gray-300 secondary text
    },
    input: {
        height: 52,
        borderColor: '#9CA3AF', // text-gray-400 for borders
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.5)', // slightly transparent input background
        color: '#FFFFFF', // white text inside inputs
        fontSize: 16,
    },
    error: {
        color: '#F87171', // text-red-400 for errors
        marginBottom: 5,
        fontSize: 12,
    },
    label: {
        fontSize: 14,
        marginBottom: 5,
        color: '#D1D5DB', // text-gray-300 for labels
    },
    radioGroup: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
    },
    detailCard: {
        padding: 16,
        backgroundColor: '#1E293B', // card background slightly lighter
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#60A5FA', // text-blue-400 accent
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    detailText: {
        fontSize: 16,
        marginBottom: 6,
        color: '#D1D5DB', // text-gray-300
    },
    valueText: {
        fontWeight: 'bold',
        color: '#FFFFFF', // text-white for values
    },
    errorText: {
        color: '#F87171', // text-red-400
        fontSize: 16,
        marginBottom: 20,
    },
    logoutButton: {
        marginTop: 30,
    },
});