const fse = jest.genMockFromModule('fs-extra');

fse.readdir = async () => [];

export default fse;
