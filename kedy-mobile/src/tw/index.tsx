import { Link as RouterLink } from 'expo-router';
import React from 'react';
import { useCssElement, useNativeVariable } from 'react-native-css';
import {
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';

export const useCSSVariable =
  process.env.EXPO_OS !== 'web'
    ? useNativeVariable
    : (variable: string) => `var(${variable})`;

export const View = (props: React.ComponentProps<typeof RNView> & { className?: string }) =>
  useCssElement(RNView, props, { className: 'style' });

export const Text = (props: React.ComponentProps<typeof RNText> & { className?: string }) =>
  useCssElement(RNText, props, { className: 'style' });

export const Pressable = (props: React.ComponentProps<typeof RNPressable> & { className?: string }) =>
  useCssElement(RNPressable, props, { className: 'style' });

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  },
) =>
  useCssElement(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });

export const TextInput = (props: React.ComponentProps<typeof RNTextInput> & { className?: string }) =>
  useCssElement(RNTextInput, props, { className: 'style' });

export const Link = (props: React.ComponentProps<typeof RouterLink> & { className?: string }) =>
  useCssElement(RouterLink, props, { className: 'style' });
